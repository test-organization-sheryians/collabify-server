import { redis } from "../../infra/redis";

/**
 * Simple Sliding Window Rate Limiter
 * @param key - The identifier (e.g., `ratelimit:check_slug:${userId}`)
 * @param limit - Max requests
 * @param windowSeconds - Time window in seconds
 * @returns true if allowed, false if limit exceeded
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  return current <= limit;
}
