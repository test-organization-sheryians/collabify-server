/**
 * Reserve the project slug for this user via LockingService.switch (rolling reservation).
 * Returns `{ available: true, reservationId }` on success, or not-available on conflict.
 */
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";
import { AppError } from "@/shared/errors";

export async function reserveSlug(
  workspaceId: string,
  normalizedSlug: string,
  userId: string,
  redis: Redis
) {
  const keys = createLockKeys("project", {
    type: "workspace",
    id: workspaceId,
  });
  const lockKey = keys.resource(normalizedSlug);
  const userResKey = keys.userReservation(userId);

  const previousSlug = await redis.get(userResKey);
  const oldLockKey = previousSlug
    ? keys.resource(previousSlug)
    : `dummy:lock:${userId}`;

  try {
    const reserved = await LockingService.switch(
      oldLockKey,
      lockKey,
      userId,
      180,
      userResKey,
      normalizedSlug
    );

    if (!reserved) {
      return {
        available: false,
        message: "Project key is currently reserved by another user",
        reason: "PROJECT_SLUG_RESERVATION_FAILED",
      };
    }

    return {
      available: true,
      reservationId: lockKey,
      message: "Project key reserved for 3 minutes",
    };
  } catch (_error) {
    throw new AppError("Internal Redis Error", "INTERNAL_SERVER_ERROR", 500);
  }
}
