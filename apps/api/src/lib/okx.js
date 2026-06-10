import crypto from "node:crypto";
import "dotenv/config";

const BASE = "https://web3.okx.com";

export const CHAIN_ID = {
  ethereum: "1", eth: "1",
  solana: "501", sol: "501",
  base: "8453", bsc: "56", bnb: "56",
  arbitrum: "42161", arb: "42161",
  polygon: "137", xlayer: "196",
};

export function chainId(chain) {
  return CHAIN_ID[chain?.toLowerCase()] || "501";
}

function sign(method, path, body, ts) {
  return crypto
    .createHmac("sha256", process.env.OKX_SECRET_KEY || "")
    .update(ts + method.toUpperCase() + path + body)
    .digest("base64");
}

function headers(method, path, body = "") {
  const ts = new Date().toISOString();
  const key = process.env.OKX_ACCESS_KEY || process.env.OKX_API_KEY || "";
  return {
    "OK-ACCESS-KEY": key,
    "OK-ACCESS-SIGN": sign(method, path, body, ts),
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE || "",
    "Content-Type": "application/json",
  };
}

export function hasOkxKeys() {
  return Boolean(
    (process.env.OKX_ACCESS_KEY || process.env.OKX_API_KEY) &&
      process.env.OKX_SECRET_KEY &&
      process.env.OKX_PASSPHRASE,
  );
}

export async function okxPost(path, data) {
  const body = JSON.stringify(data);
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: headers("POST", path, body), body });
  return res.json();
}

export async function okxGet(path) {
  const res = await fetch(`${BASE}${path}`, { method: "GET", headers: headers("GET", path) });
  return res.json();
}

export async function priceInfo(address, chain) {
  return okxPost("/api/v6/dex/market/price-info", [
    { chainIndex: chainId(chain), tokenContractAddress: address },
  ]);
}

export async function batchPrices(pairs) {
  return okxPost("/api/v6/dex/market/price", pairs.map((p) => ({
    chainIndex: chainId(p.chain),
    tokenContractAddress: p.address,
  })));
}

export async function advancedInfo(address, chain) {
  const q = new URLSearchParams({ chainIndex: chainId(chain), tokenContractAddress: address });
  return okxGet(`/api/v6/dex/market/token/advanced-info?${q}`);
}

export async function signalList(chain, limit = 10) {
  return okxPost("/api/v6/dex/market/signal/list", { chainIndex: chainId(chain), limit: String(limit) });
}

export async function tokenTrades(address, chain, limit = 15) {
  const q = new URLSearchParams({
    chainIndex: chainId(chain),
    tokenContractAddress: address,
    limit: String(limit),
  });
  return okxGet(`/api/v6/dex/market/trades?${q}`);
}

export async function hotTokens(chain, limit = 8) {
  const q = new URLSearchParams({ rankingType: "4", limit: String(limit), chainIndex: chainId(chain) });
  return okxGet(`/api/v6/dex/market/token/hot-token?${q}`);
}

export async function leaderboard(chain, limit = 5) {
  const q = new URLSearchParams({ chainIndex: chainId(chain), timeFrame: "1", sortBy: "1", limit: String(limit) });
  return okxGet(`/api/v6/dex/market/leaderboard/list?${q}`);
}

export async function vibeTimeline(chain, address) {
  const q = new URLSearchParams({ chainIndex: chainId(chain), tokenContractAddress: address });
  return okxGet(`/api/v6/dex/market/social/vibe/timeline?${q}`);
}

export async function sentimentRanking(limit = 8) {
  const q = new URLSearchParams({ timeFrame: "4", sortBy: "1", limit: String(limit) });
  return okxGet(`/api/v6/dex/market/social/sentiment/ranking?${q}`);
}