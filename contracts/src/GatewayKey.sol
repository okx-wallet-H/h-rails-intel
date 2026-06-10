// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title H Rails Gateway Key — API Key NFT for Market Data Gateway
/// @notice Mint an NFT to get an API key. NFT holds plan tier metadata.
contract GatewayKey is ERC721, Ownable, ReentrancyGuard {
    // ── State ──
    IERC20 public usdg;    // 0x4ae46a509f6b1d9056937ba4500cb143933d2dc8
    IERC20 public usdt;    // 0x779ded0c9e1022225f8e0630b35a9b54be713736

    uint256 private _nextTokenId;

    enum Plan { Free, Pro, Enterprise }

    struct KeyInfo {
        Plan plan;
        uint256 purchasedAt;
        uint256 expiresAt;
        bool active;
    }

    mapping(uint256 => KeyInfo) public keyInfo;
    mapping(address => uint256) public holderToken; // one key per address

    // ── Pricing (in token atomic units, e.g. 100 USDG = 100 * 10^18) ──
    uint256 public proPriceUsdg = 99 * 10 ** 18;   // 99 USDG/month
    uint256 public proPriceUsdt = 99 * 10 ** 6;    // 99 USDT/month
    uint256 public constant MONTH = 30 days;

    // ── Events ──
    event KeyPurchased(address indexed buyer, uint256 tokenId, Plan plan, string apiKeyHash);
    event KeyRevoked(uint256 tokenId);
    event KeyRenewed(uint256 tokenId, uint256 newExpiry);
    event KeyUpgraded(address indexed holder, uint256 tokenId, Plan plan, uint256 expiresAt);

    constructor(
        address _usdg,
        address _usdt
    ) ERC721("H Rails Gateway Key", "HRGK") Ownable(msg.sender) {
        usdg = IERC20(_usdg);
        usdt = IERC20(_usdt);
    }

    // ═══════════════════════════════════════════
    // Purchase
    // ═══════════════════════════════════════════

    /// @notice Purchase a Pro key with USDG
    function purchaseWithUSDG() external nonReentrant returns (uint256) {
        require(holderToken[msg.sender] == 0, "Already owns a key");
        usdg.transferFrom(msg.sender, owner(), proPriceUsdg);
        return _mintKey(msg.sender, Plan.Pro);
    }

    /// @notice Purchase a Pro key with USDT
    function purchaseWithUSDT() external nonReentrant returns (uint256) {
        require(holderToken[msg.sender] == 0, "Already owns a key");
        usdt.transferFrom(msg.sender, owner(), proPriceUsdt);
        return _mintKey(msg.sender, Plan.Pro);
    }

    /// @notice Claim free key (one per address)
    function claimFree() external nonReentrant returns (uint256) {
        require(holderToken[msg.sender] == 0, "Already owns a key");
        return _mintKey(msg.sender, Plan.Free);
    }

    /// @notice Upgrade an existing Free key to Pro with USDT
    function upgradeToProWithUSDT() external nonReentrant {
        uint256 tokenId = holderToken[msg.sender];
        require(tokenId != 0, "No key found");
        KeyInfo storage info = keyInfo[tokenId];
        require(info.plan == Plan.Free, "Not a free key");
        require(info.active, "Key inactive");
        usdt.transferFrom(msg.sender, owner(), proPriceUsdt);
        info.plan = Plan.Pro;
        info.purchasedAt = block.timestamp;
        info.expiresAt = block.timestamp + MONTH;
        emit KeyUpgraded(msg.sender, tokenId, Plan.Pro, info.expiresAt);
    }

    /// @notice Upgrade an existing Free key to Pro with USDG
    function upgradeToProWithUSDG() external nonReentrant {
        uint256 tokenId = holderToken[msg.sender];
        require(tokenId != 0, "No key found");
        KeyInfo storage info = keyInfo[tokenId];
        require(info.plan == Plan.Free, "Not a free key");
        require(info.active, "Key inactive");
        usdg.transferFrom(msg.sender, owner(), proPriceUsdg);
        info.plan = Plan.Pro;
        info.purchasedAt = block.timestamp;
        info.expiresAt = block.timestamp + MONTH;
        emit KeyUpgraded(msg.sender, tokenId, Plan.Pro, info.expiresAt);
    }

    /// @notice Renew an existing key
    function renewWithUSDG() external nonReentrant {
        uint256 tokenId = holderToken[msg.sender];
        require(tokenId != 0, "No key found");
        usdg.transferFrom(msg.sender, owner(), proPriceUsdg);
        keyInfo[tokenId].expiresAt = block.timestamp + MONTH;
        if (!keyInfo[tokenId].active) keyInfo[tokenId].active = true;
        emit KeyRenewed(tokenId, keyInfo[tokenId].expiresAt);
    }

    // ═══════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════

    function _mintKey(address to, Plan plan) internal returns (uint256) {
        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        keyInfo[tokenId] = KeyInfo({
            plan: plan,
            purchasedAt: block.timestamp,
            expiresAt: plan == Plan.Free ? type(uint256).max : block.timestamp + MONTH,
            active: true
        });
        holderToken[to] = tokenId;
        emit KeyPurchased(to, tokenId, plan, "");
        return tokenId;
    }

    // ═══════════════════════════════════════════
    // Admin
    // ═══════════════════════════════════════════

    function revokeKey(uint256 tokenId) external onlyOwner {
        keyInfo[tokenId].active = false;
        emit KeyRevoked(tokenId);
    }

    function setPriceUsdg(uint256 newPrice) external onlyOwner {
        proPriceUsdg = newPrice;
    }

    function setPriceUsdt(uint256 newPrice) external onlyOwner {
        proPriceUsdt = newPrice;
    }

    function grantEnterprise(address to) external onlyOwner {
        require(holderToken[to] == 0, "Already owns a key");
        _mintKey(to, Plan.Enterprise);
    }

    // ═══════════════════════════════════════════
    // Views
    // ═══════════════════════════════════════════

    function getKey(address user) external view returns (
        uint256 tokenId, Plan plan, uint256 purchasedAt, uint256 expiresAt, bool active
    ) {
        tokenId = holderToken[user];
        if (tokenId == 0) return (0, Plan.Free, 0, 0, false);
        KeyInfo memory info = keyInfo[tokenId];
        return (tokenId, info.plan, info.purchasedAt, info.expiresAt, info.active);
    }

    function isKeyValid(address user) external view returns (bool) {
        uint256 tokenId = holderToken[user];
        if (tokenId == 0) return false;
        KeyInfo memory info = keyInfo[tokenId];
        return info.active && (info.plan == Plan.Free || info.expiresAt > block.timestamp);
    }
}
