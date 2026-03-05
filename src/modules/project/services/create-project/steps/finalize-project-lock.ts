/**
 * Promote the Redis lock to a permanent "exists" cache entry after a successful DB write.
 * Swallows Redis errors (the DB is already committed) and logs a warning.
 */
import { createLogger } from "@/shared/lib/logger";
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("project:services:create-project");

export async function finalizeProjectLock(
  workspaceId: string,
  slug: string,
  lockKey: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const keys = createLockKeys("project", {
    type: "workspace",
    id: workspaceId,
  });
  const existsKey = keys.exists(slug);
  const userResKey = keys.userReservation(userId);

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
    logger.warn("Project Lock Finalize Error", { err: error });
  }
}
