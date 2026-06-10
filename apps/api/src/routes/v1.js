import { Router } from "express";
import { getDeepIntel, getMarketOverview, getMonitorFeed } from "../lib/aggregator.js";
import { cached } from "../lib/cache.js";
import { getGatewayConfig } from "../lib/gateway-key.js";
import { claimFreeViaOnchainos, getOnchainosWalletStatus } from "../lib/gateway-onchainos.js";
import { DEFAULT_FOCUS } from "../lib/watchlist.js";
import { requireApiKey, validateApiKeyAsync } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";

const router = Router();
const gated = [requireApiKey, rateLimitMiddleware];

function withMeta(req, start, cache = { hit: false, ttl: 0 }) {
  return {
    plan: req.meta?.plan || "public",
    cached: cache.hit,
    ttl: cache.ttl,
    latencyMs: Date.now() - start,
  };
}

router.get("/gateway/config", async (_req, res) => {
  try {
    const data = await getGatewayConfig();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/gateway/wallet-status", (_req, res) => {
  try {
    const data = getOnchainosWalletStatus();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/gateway/claim-free-onchainos", async (req, res) => {
  try {
    const data = claimFreeViaOnchainos(req.body?.address);
    res.json({ success: true, data });
  } catch (e) {
    const status = e.message?.includes("未登录") ? 401 : 400;
    res.status(status).json({ success: false, error: e.message });
  }
});

router.get("/market/overview", ...gated, async (req, res) => {
  const start = Date.now();
  const ttl = 30;
  try {
    const { value: data, hit } = await cached("v1:market:overview", getMarketOverview, ttl);
    res.json({ success: true, data, meta: withMeta(req, start, { hit, ttl }) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/token/:chain/:address", ...gated, async (req, res) => {
  const start = Date.now();
  const ttl = 20;
  const key = `v1:token:${req.params.chain}:${req.params.address.toLowerCase()}`;
  try {
    const { value: data, hit } = await cached(
      key,
      () => getDeepIntel(req.params.chain, req.params.address),
      ttl,
    );
    res.json({ success: true, data, meta: withMeta(req, start, { hit, ttl }) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/monitor/:chain", ...gated, async (req, res) => {
  const start = Date.now();
  const ttl = 15;
  const key = `v1:monitor:${req.params.chain}`;
  try {
    const { value: data, hit } = await cached(
      key,
      () => getMonitorFeed(req.params.chain),
      ttl,
    );
    res.json({ success: true, data, meta: withMeta(req, start, { hit, ttl }) });
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

router.get("/key/validate", async (req, res) => {
  try {
    const keyInfo = await validateApiKeyAsync(req.headers["x-api-key"]);
    if (!keyInfo) return res.status(401).json({ success: false, error: "无效的 API Key" });
    res.json({ success: true, data: { plan: keyInfo.plan, name: keyInfo.name } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/focus", (_req, res) => {
  res.json({ success: true, data: DEFAULT_FOCUS });
});

export default router;