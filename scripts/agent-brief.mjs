#!/usr/bin/env node
/**
 * H Rails 监控 Agent — 拉取行情 + 监控流，输出简报
 *
 * HRAILS_API_KEY=0x... node scripts/agent-brief.mjs
 * node scripts/agent-brief.mjs --watch --interval 300
 */
import { execFileSync } from "node:child_process";

const BASE = process.env.HRAILS_API_URL || "http://localhost:3847";
const WATCH = process.argv.includes("--watch");
const INTERVAL = Number(process.argv.find((a) => a.startsWith("--interval="))?.split("=")[1] || 300) * 1000;

function resolveApiKey() {
  if (process.env.HRAILS_API_KEY) return process.env.HRAILS_API_KEY;
  try {
    const out = execFileSync("onchainos", ["wallet", "addresses", "--chain", "xlayer"], { encoding: "utf8" });
    const json = JSON.parse(out);
    const addr = json.data?.xlayer?.[0]?.address;
    if (addr) return addr;
  } catch { /* no onchainos */ }
  throw new Error("设置 HRAILS_API_KEY 或登录 onchainos Agent Wallet");
}

async function api(path, apiKey) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-api-key": apiKey } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status} ${path}`);
  return body.data ?? body;
}

function fmtPct(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

async function runBrief() {
  const apiKey = resolveApiKey();
  const [market, monitor, sol] = await Promise.all([
    api("/api/v1/market/overview", apiKey),
    api("/api/v1/monitor/solana", apiKey),
    api("/api/v1/token/solana/So11111111111111111111111111111111111111112", apiKey),
  ]);

  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const lines = [
    `══════════════════════════════════════`,
    `  H Rails Agent 简报  ${now}`,
    `  Key: ${apiKey.slice(0, 6)}…${apiKey.slice(-4)}`,
    `══════════════════════════════════════`,
    ``,
    `【市场概览】跟踪 ${market.summary?.tracked ?? "?"} 币 · 24h 跌多涨少`,
  ];

  for (const t of (market.tokens || []).slice(0, 5)) {
    lines.push(`  ${t.symbol.padEnd(5)} $${t.priceFormatted ?? t.price}  ${fmtPct(t.change24h)}  vol $${((t.volume24h || 0) / 1e9).toFixed(2)}B`);
  }

  lines.push(``, `【SOL 深度】`);
  lines.push(`  价格 $${Number(sol.price || 0).toFixed(2)}  24h ${fmtPct(sol.change?.h24)}  流动性 $${(Number(sol.liquidity || 0) / 1e9).toFixed(2)}B`);
  lines.push(`  风险 ${sol.risk?.level ?? "—"}  持仓 ${sol.holders ?? "—"}`);

  const events = monitor?.events || monitor?.items || monitor?.feed || [];
  if (Array.isArray(events) && events.length) {
    lines.push(``, `【链上监控 · Solana】最新 ${Math.min(3, events.length)} 条`);
    for (const e of events.slice(0, 3)) {
      lines.push(`  · ${e.title || e.type || e.symbol || JSON.stringify(e).slice(0, 60)}`);
    }
  } else {
    lines.push(``, `【链上监控】${monitor?.summary || "数据已拉取"}`);
  }

  lines.push(``, `──────────────────────────────────────`);
  console.log(lines.join("\n"));
}

async function main() {
  if (!WATCH) {
    await runBrief();
    return;
  }
  console.log(`监控模式：每 ${INTERVAL / 1000}s 刷新一次 (Ctrl+C 退出)\n`);
  for (;;) {
    try {
      await runBrief();
    } catch (e) {
      console.error(`[${new Date().toISOString()}] ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});