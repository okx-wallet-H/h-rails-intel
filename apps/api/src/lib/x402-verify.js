import { verifyTypedData } from "viem";
import { PAYMENT_ACCEPTS } from "./x402.js";

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const usedNonces = new Map();
const NONCE_TTL_MS = 86_400_000;

function parseChainId(network) {
  const match = String(network || "").match(/^eip155:(\d+)$/);
  if (!match) throw new Error("无效的网络格式");
  return Number(match[1]);
}

function cleanupNonces() {
  const now = Date.now();
  for (const [key, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
}

export function parsePaymentSignature(raw) {
  const decoded = Buffer.from(String(raw), "base64").toString("utf8");
  return JSON.parse(decoded);
}

function matchesAccept(accepted, required) {
  return (
    accepted?.scheme === required.scheme
    && accepted?.network === required.network
    && accepted?.asset?.toLowerCase() === required.asset.toLowerCase()
    && accepted?.payTo?.toLowerCase() === required.payTo.toLowerCase()
    && String(accepted?.amount) === String(required.amount)
  );
}

/**
 * @param {object} envelope Parsed PAYMENT-SIGNATURE payload
 * @param {string} resourceUrl
 */
export async function verifyX402Payment(envelope, resourceUrl) {
  if (!envelope || envelope.x402Version !== 2) {
    throw new Error("不支持的 x402 版本");
  }

  const accepted = envelope.accepted;
  const inner = envelope.payload;
  if (!accepted || !inner?.authorization || !inner?.signature) {
    throw new Error("PAYMENT-SIGNATURE 格式无效");
  }

  const required = PAYMENT_ACCEPTS.find((a) => matchesAccept(accepted, a));
  if (!required) throw new Error("支付方案不匹配");

  const { authorization, signature } = inner;
  const now = Math.floor(Date.now() / 1000);
  const validBefore = Number(authorization.validBefore || 0);
  const validAfter = Number(authorization.validAfter || 0);

  if (validBefore && now > validBefore) throw new Error("支付授权已过期");
  if (validAfter && now < validAfter) throw new Error("支付授权尚未生效");
  if (BigInt(authorization.value || 0) < BigInt(required.amount)) {
    throw new Error("支付金额不足");
  }

  cleanupNonces();
  const nonceKey = `${authorization.from}:${authorization.nonce}`.toLowerCase();
  if (usedNonces.has(nonceKey)) throw new Error("支付 nonce 已使用");
  usedNonces.set(nonceKey, Date.now() + NONCE_TTL_MS);

  const extra = required.extra || {};
  const chainId = parseChainId(required.network);
  const ok = await verifyTypedData({
    address: authorization.from,
    domain: {
      name: extra.name || extra.symbol || "USD₮0",
      version: extra.version || "1",
      chainId,
      verifyingContract: required.asset,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter || 0),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
    signature,
  });

  if (!ok) throw new Error("EIP-3009 签名验证失败");

  if (envelope.resource?.url && resourceUrl && !resourceUrl.startsWith(envelope.resource.url.split("?")[0])) {
    // Allow query param differences on same path
    const a = new URL(envelope.resource.url, "http://local");
    const b = new URL(resourceUrl, "http://local");
    if (a.pathname !== b.pathname) throw new Error("支付资源 URL 不匹配");
  }

  return {
    payer: authorization.from,
    amount: authorization.value,
    scheme: required.scheme,
    network: required.network,
  };
}