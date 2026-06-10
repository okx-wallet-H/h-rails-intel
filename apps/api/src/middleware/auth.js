import { PLAN_LABELS } from "@h-rails/types";

const KEY_STORE = new Map();

function loadKeys() {
  const raw = process.env.GATEWAY_KEYS || "";
  if (raw) {
    for (const entry of raw.split(",")) {
      const [key, plan, name] = entry.split(":");
      if (key?.trim() && plan?.trim()) {
        KEY_STORE.set(key.trim(), {
          key: key.trim(),
          plan: plan.trim(),
          name: name?.trim(),
          active: true,
        });
      }
    }
  }

  if (KEY_STORE.size === 0) {
    KEY_STORE.set("gw-dev-key-001", {
      key: "gw-dev-key-001",
      plan: "pro",
      name: "Development",
      active: true,
    });
  }
}

loadKeys();

/** @returns {import('@h-rails/types').GatewayKey | null} */
export function validateApiKey(raw) {
  if (!raw) return null;
  const key = raw.trim();

  const entry = KEY_STORE.get(key);
  if (entry?.active) return entry;

  if (key.startsWith("0x") && key.length === 42) {
    return { key, plan: "free", name: "Wallet", active: true };
  }

  return null;
}

export function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const keyInfo = validateApiKey(apiKey);

  if (!keyInfo) {
    return res.status(401).json({ success: false, error: "无效的 API Key" });
  }

  req.gatewayKey = keyInfo;
  req.meta = { plan: keyInfo.plan, planLabel: PLAN_LABELS[keyInfo.plan] || keyInfo.plan };
  return next();
}