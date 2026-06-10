import { createPublicClient, http } from "viem";
import { xLayer } from "viem/chains";

export const X_LAYER_USDG = "0x4ae46a509F6b1D9056937BA4500cb143933D2dc8";
export const X_LAYER_USDT = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

export const GATEWAY_ABI = [
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
  {
    name: "isKeyValid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "proPriceUsdg",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "proPriceUsdt",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

const PLAN_MAP = ["free", "pro", "enterprise"];

let publicClient;

function getClient() {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: xLayer,
      transport: http(process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech"),
    });
  }
  return publicClient;
}

export function getContractAddress() {
  const addr = process.env.GATEWAY_CONTRACT_ADDRESS || "";
  if (!addr || /^0x0{40}$/i.test(addr)) return null;
  return addr;
}

const keyCache = new Map();
const KEY_CACHE_MS = 60_000;

/**
 * @param {string} address
 * @returns {Promise<import('@h-rails/types').GatewayKey | null>}
 */
export async function queryGatewayKey(address) {
  const contract = getContractAddress();
  if (!contract) return null;

  const normalized = address.toLowerCase();
  const cached = keyCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const client = getClient();
    const [tokenId, plan, , expiresAt, active] = await client.readContract({
      address: contract,
      abi: GATEWAY_ABI,
      functionName: "getKey",
      args: [address],
    });

    if (!active || tokenId === 0n) {
      keyCache.set(normalized, { value: null, expiresAt: Date.now() + KEY_CACHE_MS });
      return null;
    }

    const planName = PLAN_MAP[Number(plan)] || "free";
    const isExpired = planName !== "free" && expiresAt <= BigInt(Math.floor(Date.now() / 1000));
    if (isExpired) {
      keyCache.set(normalized, { value: null, expiresAt: Date.now() + KEY_CACHE_MS });
      return null;
    }

    const value = {
      key: address,
      plan: planName,
      name: "On-chain Key",
      active: true,
    };
    keyCache.set(normalized, { value, expiresAt: Date.now() + KEY_CACHE_MS });
    return value;
  } catch (e) {
    console.warn("[gateway-key] on-chain lookup failed:", e.message);
    return null;
  }
}

export async function getGatewayConfig() {
  const contract = getContractAddress();
  const base = {
    network: "X Layer",
    chainId: 196,
    caip: "eip155:196",
    contract: contract,
    tokens: {
      usdg: X_LAYER_USDG,
      usdt: X_LAYER_USDT,
    },
    pricing: {
      proUsdg: "99",
      proUsdt: "99",
      currency: "month",
    },
    plans: {
      free: { rateLimit: 10, label: "Free" },
      pro: { rateLimit: 60, label: "Pro" },
      enterprise: { rateLimit: 300, label: "Enterprise" },
    },
  };

  if (!contract) return base;

  try {
    const client = getClient();
    const [usdg, usdt] = await Promise.all([
      client.readContract({ address: contract, abi: GATEWAY_ABI, functionName: "proPriceUsdg" }),
      client.readContract({ address: contract, abi: GATEWAY_ABI, functionName: "proPriceUsdt" }),
    ]);
    base.pricing.proUsdg = (Number(usdg) / 1e18).toString();
    base.pricing.proUsdt = (Number(usdt) / 1e6).toString();
  } catch { /* use defaults */ }

  return base;
}