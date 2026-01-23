import { SlugUtil } from "@/shared/utils/slug.util";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";
import { checkRateLimit } from "@/shared/utils/rate-limiter";
import { CheckAvailabilitySchema } from "./schema";
import { z } from "zod";
import { ServiceContext } from "@/graphql/types";
import { LockingService, createLockKeys } from "@/services/locking";

type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;

export const checkSlugAvailability = async (
  input: CheckAvailabilityInput,
  ctx: ServiceContext
) => {
  const { slug, userId } = input;
  const { db, redis } = ctx;

  const keys = createLockKeys("workspace");

  // 0. Rate Limit
  const allowed = await checkRateLimit(
    keys.rateLimit(userId),
    WORKSPACE_LIMITS.CHECK_AVAILABILITY_RATE_LIMIT.MAX_REQUESTS,
    WORKSPACE_LIMITS.CHECK_AVAILABILITY_RATE_LIMIT.WINDOW_SECONDS
  );

  if (!allowed) {
    throw new AppError(
      "Too many attempts. Please try again later.",
      "WORKSPACE_SLUG_RATE_LIMITED",
      429
    );
  }

  const normalizedSlug = SlugUtil.sanitize(slug);

  // 1. Check Permanent Cache (Soft)
  try {
    const existsCache = await redis.get(keys.exists(normalizedSlug));
    if (existsCache) {
      return {
        available: false,
        message: "Workspace already exists",
        reason: "WORKSPACE_SLUG_TAKEN_PERMANENT",
      };
    }
  } catch (error) {
    logger.warn({ error }, "Redis cache check failed");
    // Ignore Redis cache errors, fall through to DB check
  }

  // 2. Check Lock (Soft)
  const lockKey = keys.resource(normalizedSlug);
  try {
    const reservedBy = await redis.get(lockKey);
    if (reservedBy && reservedBy !== userId) {
      return {
        available: false,
        message: "Slug is currently reserved",
        reason: "WORKSPACE_SLUG_TAKEN_RESERVED",
      };
    }
  } catch (error) {
    logger.warn({ error }, "Redis lock check failed");
    // Ignore Redis lock errors
  }

  // 3. Check Permanent DB (Hard Source of Truth)
  const existingDB = await db.workspace.findUnique({
    where: { slug: normalizedSlug },
  });
  if (existingDB) {
    return {
      available: false,
      message: "Workspace already exists",
      reason: "WORKSPACE_SLUG_TAKEN_PERMANENT",
    };
  }

  // 3. Attempt Reservation via LockingService (Rolling Reservation)
  // We need to know our PREVIOUS reservation to release it.
  const userResKey = keys.userReservation(userId);
  const previousSlug = await redis.get(userResKey);

  const oldLockKey = previousSlug
    ? keys.resource(previousSlug)
    : `dummy:lock:${userId}`; // Non-existent key for first-time alloc

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

    // Pointer updated atomically in service
    // await redis.set(userResKey, normalizedSlug, "EX", 180);

    return {
      available: true,
      reservationId: lockKey,
    };
  } catch (error) {
    logger.error(
      { error },
      "Redis reservation failed, falling back to soft check"
    );
    // Redis Failure Fallback: Return available (checked DB) but no reservation
    return {
      available: true,
      reservationId: null,
    };
  }
};
