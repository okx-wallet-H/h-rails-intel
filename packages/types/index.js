/** @typedef {"free" | "pro" | "enterprise"} PlanTier */

/**
 * @typedef {Object} GatewayKey
 * @property {string} key
 * @property {PlanTier} plan
 * @property {string} [name]
 * @property {boolean} active
 */

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed
 * @property {number} remaining
 */

export const TIER_LIMITS = {
  free: 10,
  pro: 60,
  enterprise: 300,
};

export const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};