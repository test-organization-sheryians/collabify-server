/**
 * Check if the slug lock is held by another user.
 * Returns true if locked by someone else, false otherwise.
 * Swallows Redis errors and returns false.
 */
import { createLogger } from "@/shared/lib/logger";
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:check-slug-availability");

export async function checkSlugLocked(
  normalizedSlug: string,
  userId: string,
  redis: Redis
): Promise<boolean> {
  const keys = createLockKeys("workspace");
  try {
    const reservedBy = await redis.get(keys.resource(normalizedSlug));
    return !!(reservedBy && reservedBy !== userId);
  } catch (error) {
    logger.warn("Redis lock check failed", { err: error });
    return false;
  }
}
