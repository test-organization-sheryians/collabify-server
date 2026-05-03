/**
 * Try to load the user from the Redis cache.
 * Returns the parsed user object if found, null on cache miss.
 * Does NOT swallow errors — Redis failures propagate (by design).
 */
import type { Redis } from "ioredis";

export async function fetchFromCache(cacheKey: string, redis: Redis) {
  const cached = await redis.get(cacheKey);
  if (!cached) return null;
  return JSON.parse(cached);
}
