import { Router } from "express";
import { getDeepIntel } from "../lib/aggregator.js";
import { DEFAULT_FOCUS } from "../lib/watchlist.js";
import {
  buildPaymentRequired,
  encodePaymentRequired,
  payWithOnchainos,
  PAYMENT_ACCEPTS,
} from "../lib/x402.js";
import { parsePaymentSignature, verifyX402Payment } from "../lib/x402-verify.js";

const router = Router();

router.get("/premium/deep-intel", async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const paymentHeader = req.headers["payment-signature"];

  if (!paymentHeader) {
    const payload = buildPaymentRequired(url);
    return res
      .status(402)
      .set("PAYMENT-REQUIRED", encodePaymentRequired(payload))
      .set("Access-Control-Expose-Headers", "PAYMENT-REQUIRED")
      .json(payload);
  }

  try {
    const envelope = parsePaymentSignature(paymentHeader);
    const payment = await verifyX402Payment(envelope, url);

    const chain = String(req.query.chain || DEFAULT_FOCUS.chain);
    const address = String(req.query.address || DEFAULT_FOCUS.address);
    const data = await getDeepIntel(chain, address);
    res.json({
      success: true,
      code: "0",
      data,
      paid: true,
      payer: payment.payer,
      protocol: "Agent Payments Protocol",
      scheme: "x402",
      network: "eip155:196",
    });
  } catch (e) {
    const msg = e.message || "支付验证失败";
    if (msg.includes("签名") || msg.includes("支付") || msg.includes("nonce") || msg.includes("过期")) {
      return res.status(402).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

router.post("/auto-pay-demo", async (req, res) => {
  const chain = req.body?.chain || DEFAULT_FOCUS.chain;
  const address = req.body?.address || DEFAULT_FOCUS.address;
  const port = process.env.PORT || 3847;
  const target = `http://localhost:${port}/api/x402/premium/deep-intel?chain=${chain}&address=${encodeURIComponent(address)}`;

  try {
    const first = await fetch(target);
    if (first.status !== 402) {
      return res.json({ step: "free", data: await first.json() });
    }

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
      steps: ["402 received", "X Layer EIP-3009 signed", "request replayed", "signature verified"],
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

export default router;