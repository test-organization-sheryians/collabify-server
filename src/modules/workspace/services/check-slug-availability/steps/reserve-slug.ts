/**
 * Reserve the slug for this user via LockingService.switch (rolling reservation).
 * Returns `{ available: true, reservationId }` on success,
 * or `{ available: false, ... }` if reservation fails.
 * Falls back to `{ available: true, reservationId: null }` on Redis failure.
 */
import { createLogger } from "@/shared/lib/logger";
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

const logger = createLogger("workspace:services:check-slug-availability");

export async function reserveSlug(
  normalizedSlug: string,
  userId: string,
  redis: Redis
) {
  const keys = createLockKeys("workspace");
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
        message: "Slug is currently reserved",
        reason: "WORKSPACE_SLUG_RESERVATION_FAILED",
      };
    }

    return { available: true, reservationId: lockKey };
  } catch (error) {
    logger.error("Redis reservation failed, falling back to soft check", {
      err: error,
    });
    return { available: true, reservationId: null };
  }
}
