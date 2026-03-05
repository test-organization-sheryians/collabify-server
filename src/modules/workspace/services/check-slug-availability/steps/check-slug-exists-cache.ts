/**
 * Check the Redis "exists" cache for a normalized slug.
 * Returns true if the slug is known to exist (taken), false otherwise.
 * Swallows Redis errors and returns false (fall through to DB check).
 */
import { createLogger } from "@/shared/lib/logger";
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:check-slug-availability");

export async function checkSlugExistsCache(
  normalizedSlug: string,
  redis: Redis
): Promise<boolean> {
  const keys = createLockKeys("workspace");
  try {
    const existsCache = await redis.get(keys.exists(normalizedSlug));
    return !!existsCache;
  } catch (error) {
    logger.warn("Redis cache check failed", { err: error });
    return false;
  }
}
