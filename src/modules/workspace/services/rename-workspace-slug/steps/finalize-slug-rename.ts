/**
 * After DB rename succeeds:
 * 1. Promote new slug lock → workspace:exists:{newSlug} cache (via LockingService.finalize)
 * 2. Explicitly delete workspace:exists:{oldSlug} (allows old slug to be claimed immediately)
 *
 * All Redis operations are best-effort. Swallow errors — DB is already committed.
 */
import { createLogger } from "@/shared/lib/logger";
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:rename-workspace-slug");

export async function finalizeSlugRename(
  newSlug: string,
  lockKey: string,
  oldSlug: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const keys = createLockKeys("workspace");
  const userResKey = keys.userReservation(userId);
  const existsKey = keys.exists(newSlug);
  const oldExistsKey = keys.exists(oldSlug);

  try {
    // Promote new lock → permanent exists cache
    await LockingService.finalize(
      lockKey,
      existsKey,
      "1",
      3600,
      userId,
      userResKey
    );
  } catch (error) {
    logger.error("Redis finalize failed after DB rename, relying on TTL", {
      err: error,
      userId,
      newSlug,
    });
  }

  try {
    // Release old slug so it can be claimed by others
    await redis.del(oldExistsKey);
  } catch (error) {
    logger.warn("Redis old slug cleanup failed, TTL will expire it", {
      err: error,
      oldSlug,
    });
  }
}
