import { execFileSync } from "node:child_process";

export const PAYMENT_ACCEPTS = [
  {
    scheme: "exact",
    network: "eip155:196",
    amount: "500",
    payTo: "0x0dedc3c5e15bee45166924ea5b02f54a35b1f9c6",
    maxTimeoutSeconds: 86400,
    asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
    extra: { symbol: "USD₮0", version: "1", transferMethod: "eip3009", name: "USD₮0" },
  },
];

export function buildPaymentRequired(url) {
  return {
    x402Version: 2,
    resource: { url, mimeType: "application/json" },
    accepts: PAYMENT_ACCEPTS,
  };
}

export function encodePaymentRequired(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function payWithOnchainos(accepts = PAYMENT_ACCEPTS) {
  const output = execFileSync(
    "onchainos",
    ["payment", "pay", "--accepts", JSON.stringify(accepts)],
    { encoding: "utf8" },
  );
  const result = JSON.parse(output);
  if (!result.ok) throw new Error(output);
  return result.data;
}