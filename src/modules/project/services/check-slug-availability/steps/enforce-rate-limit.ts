/**
 * Enforce rate limit for project slug availability checks.
 * Returns a "not available" response if limit exceeded, null if allowed.
 * Uses Redis INCR + EXPIRE pattern.
 */
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function enforceRateLimit(
  workspaceId: string,
  userId: string,
  redis: Redis
) {
  const keys = createLockKeys("project", {
    type: "workspace",
    id: workspaceId,
  });
  const rateLimitKey = keys.rateLimit(userId);
  const currentUsage = await redis.incr(rateLimitKey);

  if (currentUsage === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  }

  if (currentUsage > RATE_LIMIT_MAX) {
    return {
      available: false,
      message: "Too many attempts. Please wait 1 minute.",
      reason: "PROJECT_SLUG_RATE_LIMITED",
    };
  }

  return null;
}
