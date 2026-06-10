const memory = new Map();
let redisClient = null;
let redisReady = false;

async function getRedis() {
  if (redisClient !== null) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = false;
    return false;
  }

  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: () => null,
    });
    await redisClient.ping();
    redisReady = true;
    console.log("[cache] Redis connected");
    return redisClient;
  } catch (e) {
    console.warn("[cache] Redis unavailable, using memory:", e.message);
    redisClient = false;
    return false;
  }
}

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} factory
 * @param {number} ttlSec
 * @returns {Promise<{ value: T, hit: boolean }>}
 */
export async function cached(key, factory, ttlSec = 30) {
  const redis = await getRedis();

  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) return { value: JSON.parse(raw), hit: true };
    } catch { /* fall through */ }
  } else {
    const entry = memory.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return { value: entry.value, hit: true };
    }
  }

  const value = await factory();

  if (redis) {
    try {
      await redis.setex(key, ttlSec, JSON.stringify(value));
    } catch { /* noop */ }
  } else {
    memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  return { value, hit: false };
}

export function cacheBackend() {
  if (redisReady) return "redis";
  if (process.env.REDIS_URL) return "redis-fallback-memory";
  return "memory";
}