import { Router } from "express";
import { getDeepIntel, getMarketOverview, getMonitorFeed } from "../lib/aggregator.js";
import { DEFAULT_FOCUS } from "../lib/watchlist.js";
import { requireApiKey, validateApiKey } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";

const router = Router();
const gated = [requireApiKey, rateLimitMiddleware];

function withMeta(req, start) {
  return {
    plan: req.meta?.plan || "public",
    cached: false,
    ttl: 0,
    latencyMs: Date.now() - start,
  };
}

router.get("/market/overview", ...gated, async (req, res) => {
  const start = Date.now();
  try {
    const data = await getMarketOverview();
    res.json({ success: true, data, meta: withMeta(req, start) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/token/:chain/:address", ...gated, async (req, res) => {
  const start = Date.now();
  try {
    const data = await getDeepIntel(req.params.chain, req.params.address);
    res.json({ success: true, data, meta: withMeta(req, start) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/monitor/:chain", ...gated, async (req, res) => {
  const start = Date.now();
  try {
    const data = await getMonitorFeed(req.params.chain);
    res.json({ success: true, data, meta: withMeta(req, start) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/dashboard", async (_req, res) => {
  const start = Date.now();
  try {
    const [market, intel, monitor] = await Promise.all([
      getMarketOverview(),
      getDeepIntel(),
      getMonitorFeed("solana"),
    ]);
    res.json({
      market,
      intel,
      monitor,
      payment: { asset: "USDT", network: "X Layer", perCall: "0.0005", protocol: "x402" },
      meta: { latencyMs: Date.now() - start },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/key/validate", (req, res) => {
  const keyInfo = validateApiKey(req.headers["x-api-key"]);
  if (!keyInfo) return res.status(401).json({ success: false, error: "无效的 API Key" });
  res.json({ success: true, data: { plan: keyInfo.plan, name: keyInfo.name } });
});

router.get("/focus", (_req, res) => {
  res.json({ success: true, data: DEFAULT_FOCUS });
});

export default router;