import { execFileSync } from "node:child_process";
import { getContractAddress } from "./gateway-key.js";

const CLAIM_FREE_DATA = "0xf366afc9";

function runOnchainosRaw(args) {
  const output = execFileSync("onchainos", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(output);
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

export function claimFreeViaOnchainos(fromAddress) {
  const contract = getContractAddress();
  if (!contract) throw new Error("GatewayKey 合约尚未配置");

  const wallet = getOnchainosWalletStatus();
  if (!wallet.loggedIn) throw new Error("onchainos 钱包未登录，请先运行 onchainos wallet login");
  if (!wallet.address) throw new Error("未找到 X Layer 钱包地址");

  if (fromAddress && fromAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`地址不匹配：当前登录钱包为 ${wallet.address}`);
  }

  const args = [
    "wallet",
    "contract-call",
    "--to",
    contract,
    "--chain",
    "xlayer",
    "--input-data",
    CLAIM_FREE_DATA,
    "--from",
    wallet.address,
  ];

  const result = runOnchainosRaw(args);
  if (!result.ok) {
    const msg = result.data?.message || result.error || JSON.stringify(result);
    throw new Error(msg);
  }

  return {
    address: wallet.address,
    txHash: result.data?.txHash || null,
    orderId: result.data?.orderId || null,
  };
}