import { redis } from "@/infra/redis";
import { SlugUtil } from "@/shared/utils/slug.util";
import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";
import { checkRateLimit } from "@/shared/utils/rate-limiter";
import { CheckAvailabilitySchema } from "../types";

export const SlugLogic = {
  async checkSlugAvailability(input: { slug: string; userId: string }) {
    const { slug, userId } = CheckAvailabilitySchema.parse(input);

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

    // 1. Check Permanent Cache
    const existsCache = await redis.get(`workspace:exists:${normalizedSlug}`);
    if (existsCache) {
      return {
        available: false,
        message: "Workspace already exists",
        reason: "WORKSPACE_SLUG_TAKEN_PERMANENT",
      };
    }

    // 2. Check Lock
    const lockKey = `reserve:slug:${normalizedSlug}`;
    const reservedBy = await redis.get(lockKey);
    if (reservedBy && reservedBy !== userId) {
      return {
        available: false,
        message: "Slug is currently reserved",
        reason: "WORKSPACE_SLUG_TAKEN_RESERVED",
      };
    }

    // 3. Check Permanent DB
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
  },
};
