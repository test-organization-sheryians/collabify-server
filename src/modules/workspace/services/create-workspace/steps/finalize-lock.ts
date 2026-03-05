/**
 * Promote the Redis lock key to a permanent "exists" cache entry.
 * Swallows Redis errors (DB is already committed) and logs a warning.
 */
import { createLogger } from "@/shared/lib/logger";
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:create-workspace");

export async function finalizeLock(
  normalizedSlug: string,
  lockKey: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const keys = createLockKeys("workspace");
  const userResKey = keys.userReservation(userId);
  const existsKey = keys.exists(normalizedSlug);

  try {
    await LockingService.finalize(
      lockKey,
      existsKey,
      "1",
      3600,
      userId,
      userResKey
    );
  } catch (error) {
    logger.error("Redis cleanup failed, relying on TTL", {
      err: error,
      userId,
      slug: normalizedSlug,
    });
  }
}
