import { runOnchainos } from "./onchainos.js";
import * as okx from "./okx.js";
import { WATCHLIST, DEFAULT_FOCUS } from "./watchlist.js";

function fmt(n, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(digits)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(digits)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(digits)}K`;
  return v.toFixed(digits);
}

function riskLabel(level) {
  const map = { 1: "低", 2: "中", 3: "高", 4: "极高" };
  return map[Number(level)] || "未知";
}

async function safe(promise, fallback = null) {
  try { return await promise; } catch { return fallback; }
}

export async function getMarketOverview() {
  const tokens = await Promise.all(
    WATCHLIST.map(async (t) => {
      let price = 0, change24h = 0, volume24h = 0, liquidity = 0, holders = 0;
      let sparkline = [];

      const info = await safe(okx.priceInfo(t.address, t.chain));
      if (info?.code === "0" && info.data?.[0]) {
        const d = info.data[0];
        price = Number(d.price) || 0;
        change24h = Number(d.priceChange24H || d.priceChange24h) || 0;
        volume24h = Number(d.volume24H || d.volume24h) || 0;
        liquidity = Number(d.liquidity) || 0;
        holders = Number(d.holders) || 0;
      }

      try {
        const kl = await runOnchainos([
          "market", "kline", "--chain", t.chain, "--address", t.address, "--bar", "1H", "--limit", "24",
        ]);
        sparkline = [...kl].reverse().filter((k) => k.confirm === "1").map((k) => Number(k.c));
      } catch { /* noop */ }

      return {
        ...t,
        price,
        priceFormatted: price >= 1 ? price.toFixed(2) : price.toFixed(4),
        change24h,
        volume24h,
        liquidity,
        holders,
        sparkline,
      };
    }),
  );

  return {
    tokens,
    summary: {
      tracked: tokens.length,
      gainers: tokens.filter((t) => t.change24h > 0).length,
      losers: tokens.filter((t) => t.change24h <= 0).length,
      totalVolume24h: tokens.reduce((s, t) => s + t.volume24h, 0),
      totalLiquidity: tokens.reduce((s, t) => s + t.liquidity, 0),
      lastUpdate: Date.now(),
    },
  };
}

export async function getDeepIntel(chain = DEFAULT_FOCUS.chain, address = DEFAULT_FOCUS.address) {
  const [info, adv, vibe, trades, signals] = await Promise.all([
    safe(okx.priceInfo(address, chain)),
    safe(okx.advancedInfo(address, chain)),
    safe(okx.vibeTimeline(chain, address)),
    safe(okx.tokenTrades(address, chain, 12)),
    safe(okx.signalList(chain, 6)),
  ]);

  const p = info?.data?.[0] || {};
  const a = adv?.data || {};
  const v = vibe?.data || {};

  return {
    chain,
    address,
    price: p.price,
    change: {
      m5: p.priceChange5M, h1: p.priceChange1H, h4: p.priceChange4H, h24: p.priceChange24H,
    },
    liquidity: p.liquidity,
    marketCap: p.marketCap,
    holders: p.holders,
    tradeNum: p.tradeNum,
    volume: { m5: p.volume5M, h1: p.volume1H, h4: p.volume4H, h24: p.volume24H },
    txs: { m5: p.txs5M, h1: p.txs1H, h4: p.txs4H, h24: p.txs24H },
    risk: {
      level: riskLabel(a.riskControlLevel),
      top10Hold: a.top10HoldPercent || a.top10HolderPercent,
      sniperHold: a.sniperHoldingPercent,
      bundleHold: a.bundleHoldingPercent,
      suspiciousHold: a.suspiciousHoldingPercent,
      devRugCount: a.devRugPullTokenCount,
      tags: a.tokenTags || [],
    },
    vibe: {
      score: v.summary?.score,
      impressions: v.summary?.impressions,
      impressionsChange: v.summary?.impressionsChangeRate,
      engagement: v.summary?.engagement,
      mentions: v.summary?.mentionsCount,
      kols: v.timeline?.[0]?.kols?.slice(0, 5) || [],
    },
    whaleTape: (trades?.data || []).slice(0, 10).map((t) => ({
      price: t.price,
      time: t.time,
      dex: t.dexName,
      hash: t.txHashUrl,
      tokens: t.changedTokenInfo,
    })),
    smartMoney: (signals?.data || []).slice(0, 6).map((s) => ({
      symbol: s.token?.symbol,
      name: s.token?.name,
      logo: s.token?.logo,
      amountUsd: s.amountUsd,
      wallets: s.triggerWalletCount,
      top10: s.token?.top10HolderPercent,
      marketCap: s.token?.marketCapUsd,
      soldRatio: s.soldRatioPercent,
    })),
  };
}

export async function getMonitorFeed(chain = "solana") {
  const [signals, hot, leaders, sentiment] = await Promise.all([
    safe(okx.signalList(chain, 8)),
    safe(okx.hotTokens(chain, 6)),
    safe(okx.leaderboard(chain, 5)),
    safe(okx.sentimentRanking(6)),
  ]);

  return {
    chain,
    signals: (signals?.data || []).map((s) => ({
      id: s.cursor,
      symbol: s.token?.symbol,
      logo: s.token?.logo,
      amountUsd: fmt(s.amountUsd),
      wallets: s.triggerWalletCount,
      price: s.price,
      top10: s.token?.top10HolderPercent,
      marketCap: fmt(s.token?.marketCapUsd),
      time: s.timestamp,
    })),
    hot: (hot?.data || []).map((h) => ({
      symbol: h.tokenSymbol || h.symbol,
      logo: h.tokenLogoUrl || h.logo,
      price: h.price,
      change: h.priceChange24H || h.change24h,
      volume: h.volume24H || h.volume24h,
      address: h.tokenContractAddress,
    })),
    leaders: (leaders?.data || []).map((l) => ({
      address: l.walletAddress || l.address,
      pnl: l.pnlUsd || l.pnl,
      winRate: l.winRate,
      volume: l.volumeUsd || l.volume,
    })),
    sentiment: (sentiment?.data || []).map((s) => ({
      symbol: s.symbol || s.tokenSymbol,
      bullish: s.bullishCount || s.bullish,
      bearish: s.bearishCount || s.bearish,
      mentions: s.mentionsCount || s.mentions,
    })),
  };
}