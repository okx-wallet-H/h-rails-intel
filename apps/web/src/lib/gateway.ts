import { createPublicClient, http, type Abi } from "viem";
import { xLayer } from "viem/chains";

export const GATEWAY_ABI = [
  { name: "claimFree", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "purchaseWithUSDG", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "purchaseWithUSDT", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
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
] as const satisfies Abi;

export const ERC20_ABI = [
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
] as const satisfies Abi;

export const publicClient = createPublicClient({
  chain: xLayer,
  transport: http("https://rpc.xlayer.tech"),
});

export const PLAN_LABELS = ["Free", "Pro", "Enterprise"];

export interface GatewayConfig {
  network: string;
  chainId: number;
  contract: string | null;
  tokens: { usdg: string; usdt: string };
  pricing: { proUsdg: string; proUsdt: string; currency: string };
  plans: Record<string, { rateLimit: number; label: string }>;
}

export async function fetchGatewayConfig(): Promise<GatewayConfig> {
  const res = await fetch("/api/v1/gateway/config");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

export function getEthereum() {
  return typeof window !== "undefined" ? (window as Window & { ethereum?: unknown }).ethereum : undefined;
}

export async function switchToXLayer() {
  const ethereum = getEthereum() as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  } | undefined;
  if (!ethereum) throw new Error("未检测到钱包");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xc4" }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xc4",
          chainName: "X Layer",
          nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
          rpcUrls: ["https://rpc.xlayer.tech"],
          blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
        }],
      });
    } else {
      throw e;
    }
  }
}