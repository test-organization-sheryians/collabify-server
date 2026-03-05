/**
 * Verify the current user holds the Redis reservation for `normalizedSlug`.
 * Throws CONFLICT if the reservation is missing or held by a different user.
 * Swallows Redis errors and proceeds optimistically (logs a warning).
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:create-workspace");

export async function verifySlugReservation(
  normalizedSlug: string,
  userId: string,
  redis: Redis
): Promise<string> {
  const keys = createLockKeys("workspace");
  const lockKey = keys.resource(normalizedSlug);

  try {
    const reservedBy = await redis.get(lockKey);
    if (reservedBy !== userId) {
      throw AppError.conflict(
        "Reservation expired or stolen. Please check availability again.",
        "WORKSPACE_CREATION_RESERVATION_STOLEN"
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("Redis lock check failed, proceeding optimistically", {
      err: error,
      userId,
      slug: normalizedSlug,
    });
  }

  return lockKey;
}
