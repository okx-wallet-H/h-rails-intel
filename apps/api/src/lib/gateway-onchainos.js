import { execFileSync } from "node:child_process";
import { createPublicClient, encodeFunctionData, http, parseUnits } from "viem";
import { xLayer } from "viem/chains";
import { getContractAddress, invalidateKeyCache, X_LAYER_USDT } from "./gateway-key.js";

const CLAIM_FREE_DATA = "0xf366afc9";

const GATEWAY_WRITE_ABI = [
  { name: "purchaseWithUSDT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "upgradeToProWithUSDT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "proPriceUsdt", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getKey",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "plan", type: "uint8" },
      { name: "purchasedAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
];

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

function runOnchainosRaw(args) {
  const output = execFileSync("onchainos", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(output);
}

function getPublicClient() {
  return createPublicClient({
    chain: xLayer,
    transport: http(process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech"),
  });
}

function contractCall(walletAddress, to, inputData) {
  const result = runOnchainosRaw([
    "wallet",
    "contract-call",
    "--to",
    to,
    "--chain",
    "xlayer",
    "--input-data",
    inputData,
    "--from",
    walletAddress,
  ]);
  if (!result.ok) {
    const msg = result.data?.message || result.error || JSON.stringify(result);
    throw new Error(msg);
  }
  return {
    txHash: result.data?.txHash || null,
    orderId: result.data?.orderId || null,
  };
}

export function getOnchainosWalletStatus() {
  try {
    const status = runOnchainosRaw(["wallet", "status"]);
    if (!status.ok || !status.data?.loggedIn) {
      return { loggedIn: false, address: null, email: null };
    }

    const addresses = runOnchainosRaw(["wallet", "addresses", "--chain", "xlayer"]);
    const xlayer = addresses.ok ? addresses.data?.xlayer?.[0]?.address : null;

    return {
      loggedIn: true,
      address: xlayer || null,
      email: status.data.email || null,
      accountName: status.data.currentAccountName || null,
    };
  } catch (e) {
    return { loggedIn: false, address: null, email: null, error: e.message };
  }
}

function assertWallet(fromAddress) {
  const contract = getContractAddress();
  if (!contract) throw new Error("GatewayKey 合约尚未配置");

  const wallet = getOnchainosWalletStatus();
  if (!wallet.loggedIn) throw new Error("onchainos 钱包未登录，请先运行 onchainos wallet login");
  if (!wallet.address) throw new Error("未找到 X Layer 钱包地址");
  if (fromAddress && fromAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`地址不匹配：当前登录钱包为 ${wallet.address}`);
  }
  return { contract, wallet };
}

export function claimFreeViaOnchainos(fromAddress) {
  const { contract, wallet } = assertWallet(fromAddress);
  const tx = contractCall(wallet.address, contract, CLAIM_FREE_DATA);
  invalidateKeyCache(wallet.address);
  return { address: wallet.address, ...tx };
}

async function ensureUsdtAllowance(client, owner, contract, amount) {
  const allowance = await client.readContract({
    address: X_LAYER_USDT,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, contract],
  });
  if (allowance >= amount) return null;

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [contract, amount],
  });
  return contractCall(owner, X_LAYER_USDT, approveData);
}

export async function purchaseProViaOnchainos(fromAddress) {
  const { contract, wallet } = assertWallet(fromAddress);
  const client = getPublicClient();

  const [tokenId, plan] = await client.readContract({
    address: contract,
    abi: GATEWAY_WRITE_ABI,
    functionName: "getKey",
    args: [wallet.address],
  });

  if (tokenId > 0n && Number(plan) !== 0) {
    throw new Error("你已有 Pro 或更高套餐，无需重复购买");
  }

  const price = await client.readContract({
    address: contract,
    abi: GATEWAY_WRITE_ABI,
    functionName: "proPriceUsdt",
  });

  const txs = [];
  const approveTx = await ensureUsdtAllowance(client, wallet.address, contract, price);
  if (approveTx) txs.push({ step: "approve", ...approveTx });

  let purchaseData;
  let step;
  if (tokenId > 0n && Number(plan) === 0) {
    step = "upgradeToProWithUSDT";
    purchaseData = encodeFunctionData({
      abi: GATEWAY_WRITE_ABI,
      functionName: "upgradeToProWithUSDT",
    });
  } else if (tokenId === 0n) {
    step = "purchaseWithUSDT";
    purchaseData = encodeFunctionData({
      abi: GATEWAY_WRITE_ABI,
      functionName: "purchaseWithUSDT",
    });
  } else {
    throw new Error("无法确定购买路径");
  }

  try {
    const purchaseTx = contractCall(wallet.address, contract, purchaseData);
    txs.push({ step, ...purchaseTx });
  } catch (e) {
    if (step === "upgradeToProWithUSDT" && String(e.message).includes("Not a free key")) {
      throw new Error("当前主网合约版本不支持 Free 升级 Pro，需要部署含 upgrade 的新合约");
    }
    if (String(e.message).toLowerCase().includes("insufficient") || String(e.message).includes("余额")) {
      throw new Error(`USDT 余额不足，Pro 需要 ${Number(price) / 1e6} USDT`);
    }
    throw e;
  }

  invalidateKeyCache(wallet.address);
  return {
    address: wallet.address,
    plan: "pro",
    priceUsdt: (Number(price) / 1e6).toString(),
    txs,
  };
}