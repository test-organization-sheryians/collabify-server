import { redis } from "@/infra/redis";
import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { CheckSlugAvailabilityInput, AvailabilityResponse } from "./types";
import { LockingService } from "@/services/locking";

export const checkSlugAvailability = async (
  input: CheckSlugAvailabilityInput
): Promise<AvailabilityResponse> => {
  const { workspaceId, slug, userId } = input;
  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

  // 1. Check Rate Limit (Hard Limit: 5 checks / 1 minute)
  const rateLimitKey = `ratelimit:check_slug:${userId}`;
  const currentUsage = await redis.incr(rateLimitKey);

  // Set expiry on first use
  if (currentUsage === 1) {
    await redis.expire(rateLimitKey, 60);
  }

  if (currentUsage > 15) {
    return {
      available: false,
      message: "Too many attempts. Please wait 1 minute.",
      reason: "PROJECT_SLUG_RATE_LIMITED",
    };
  }

  // 2. Check Permanent DB (Hard Source of Truth)
  const existingDB = await db.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: normalizedSlug } },
  });

  if (existingDB) {
    return {
      available: false,
      message: "Project with this key already exists",
      reason: "PROJECT_SLUG_TAKEN_PERMANENT",
    };
  }

  // 3. Attempt Reservation via LockingService (Rolling Reservation)
  // We need to know our PREVIOUS reservation to release it.
  const userResKey = `user:reservation:${userId}:workspace:${workspaceId}`;

  // Note: userResKey in Project context stores the SLUG, not the full lock key.
  const previousSlug = await redis.get(userResKey);
  const lockKey = `lock:workspace:${workspaceId}:project:${normalizedSlug}`;
  const ttl = 180;

  const oldLockKey = previousSlug
    ? `lock:workspace:${workspaceId}:project:${previousSlug}`
    : `dummy:lock:${userId}`; // Non-existent for first-time alloc

  try {
    const reserved = await LockingService.switch(
      oldLockKey,
      lockKey,
      userId,
      ttl,
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

    // Pointer updated atomically in service
    // await redis.set(userResKey, normalizedSlug, "EX", ttl);

    return {
      available: true,
      reservationId: lockKey,
      message: "Project key reserved for 3 minutes",
    };
  } catch (_error) {
    throw new AppError("Internal Redis Error", "INTERNAL_SERVER_ERROR", 500);
  }
};
