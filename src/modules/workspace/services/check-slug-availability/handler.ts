import { SlugUtil } from "@/shared/utils/slug.util";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";
import { checkRateLimit } from "@/shared/utils/rate-limiter";
import { CheckAvailabilitySchema } from "./schema";
import { z } from "zod";
import { ServiceContext } from "@/graphql/types";

type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;

export const checkSlugAvailability = async (
  input: CheckAvailabilityInput,
  ctx: ServiceContext
) => {
  const { slug, userId } = input;
  const { db, redis } = ctx;

  // 0. Rate Limit
  const allowed = await checkRateLimit(
    `ratelimit:check_slug:${userId}`,
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
    const existsCache = await redis.get(`workspace:exists:${normalizedSlug}`);
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
  const lockKey = `reserve:slug:${normalizedSlug}`;
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

  const ACQUIRE_LOCK_SCRIPT = `
      -- 1. Check if target slug is taken by SOMEONE ELSE
      local owner = redis.call("GET", KEYS[2])
      if owner and owner ~= ARGV[1] then
          return 0 -- Taken
      end

      -- 2. Rolling Release: Handle previous reservation
      local oldSlug = redis.call("GET", KEYS[1])
      if oldSlug and oldSlug ~= ARGV[2] then
          local oldLockKey = "reserve:slug:" .. oldSlug
          local oldOwner = redis.call("GET", oldLockKey)
          if oldOwner == ARGV[1] then
              redis.call("DEL", oldLockKey) -- Release old lock
          end
      end

      -- 3. Acquire New Lock
      redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[3])
      redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])

      return 1 -- Success
    `;

  try {
    const userResKey = `user:reservation:${userId}`;
    const result = await redis.eval(
      ACQUIRE_LOCK_SCRIPT,
      2,
      userResKey,
      lockKey,
      userId,
      normalizedSlug,
      "180" // TTL
    );

    if (result === 0) {
      return {
        available: false,
        message: "Slug is currently reserved",
        reason: "WORKSPACE_SLUG_RESERVATION_FAILED",
      };
    }

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
