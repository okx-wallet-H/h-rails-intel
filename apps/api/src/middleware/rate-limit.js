import { TIER_LIMITS } from "@h-rails/types";

const BUCKETS = new Map();
const WINDOW_MS = 60_000;

/**
 * @param {string} key
 * @param {import('@h-rails/types').PlanTier} plan
 * @returns {import('@h-rails/types').RateLimitResult}
 */
export function checkRateLimit(key, plan = "free") {
  const limit = TIER_LIMITS[plan] || TIER_LIMITS.free;
  const now = Date.now();
  const bucketKey = `${key}:${plan}`;
  const bucket = BUCKETS.get(bucketKey) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }

  if (bucket.count >= limit) {
    BUCKETS.set(bucketKey, bucket);
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  BUCKETS.set(bucketKey, bucket);
  return { allowed: true, remaining: Math.max(0, limit - bucket.count) };
}

export function rateLimitMiddleware(req, res, next) {
  const keyInfo = req.gatewayKey;
  if (!keyInfo) return next();

  const rate = checkRateLimit(keyInfo.key, keyInfo.plan);
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));

  if (!rate.allowed) {
    return res.status(429).json({ success: false, error: "请求过于频繁，请升级套餐或稍后重试" });
  }

  return next();
}