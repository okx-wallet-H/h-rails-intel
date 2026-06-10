import { Router } from "express";
import { getDeepIntel, getMarketOverview, getMonitorFeed } from "../lib/aggregator.js";
import { cached } from "../lib/cache.js";
import { getGatewayConfig } from "../lib/gateway-key.js";
import { claimFreeViaOnchainos, getOnchainosWalletStatus, purchaseProViaOnchainos } from "../lib/gateway-onchainos.js";

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

router.post("/gateway/purchase-pro-onchainos", async (req, res) => {
  try {
    const data = await purchaseProViaOnchainos(req.body?.address);
    res.json({ success: true, data });
  } catch (e) {
    const status = e.message?.includes("未登录") ? 401 : 400;
    res.status(status).json({ success: false, error: e.message });
  }
});

router.post("/x402/auto-pay", async (req, res) => {
  const port = process.env.PORT || 3847;
  const host = req.get("host")?.includes("localhost") ? `localhost:${port}` : req.get("host");
  const protocol = req.protocol;
  const chain = req.body?.chain;
  const address = req.body?.address;
  const qs = new URLSearchParams();
  if (chain) qs.set("chain", chain);
  if (address) qs.set("address", address);
  const target = `${protocol}://${host}/api/x402/premium/deep-intel${qs.toString() ? `?${qs}` : ""}`;

  try {
    const first = await fetch(target);
    if (first.status !== 402) {
      return res.json({ step: "free", data: await first.json() });
    }
    const { buildPaymentRequired, encodePaymentRequired, payWithOnchainos, PAYMENT_ACCEPTS } = await import("../lib/x402.js");
    const { parsePaymentSignature, verifyX402Payment } = await import("../lib/x402-verify.js");

    const paymentRequired = first.headers.get("payment-required")
      ? JSON.parse(Buffer.from(first.headers.get("payment-required"), "base64").toString())
      : await first.json();

    const accepted = paymentRequired.accepts.find((a) => a.asset === PAYMENT_ACCEPTS[0].asset)
      || paymentRequired.accepts[0];

    const signed = await payWithOnchainos([accepted]);
    const header = Buffer.from(JSON.stringify({
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted,
      payload: signed,
    })).toString("base64");

    const second = await fetch(target, { headers: { "PAYMENT-SIGNATURE": header } });
    const data = await second.json();

    res.json({
      success: second.ok,
      steps: ["402 received", "Agent Wallet EIP-3009 signed", "request replayed", "signature verified"],
      status: second.status,
      data,
      payer: signed.authorization?.from,
      network: "X Layer",
      protocol: "Agent Payments Protocol",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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