/**
 * Verify the user holds the Redis reservation for this project slug.
 * Throws CONFLICT if held by another user.
 * Returns the lockKey for use in finalization.
 */
import { AppError } from "@/shared/errors";
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

export async function verifySlugReservation(
  workspaceId: string,
  slug: string,
  userId: string,
  redis: Redis
): Promise<string> {
  const keys = createLockKeys("project", {
    type: "workspace",
    id: workspaceId,
  });
  const lockKey = keys.resource(slug);
  const reservedBy = await redis.get(lockKey);

  if (reservedBy && reservedBy !== userId) {
    throw AppError.conflict(
      "Reservation expired or stolen. Please check availability again.",
      "PROJECT_CREATION_RESERVATION_STOLEN"
    );
  }

  return lockKey;
}
