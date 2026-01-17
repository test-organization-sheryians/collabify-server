import { redis } from "@/infra/redis";
import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";

import { CheckSlugAvailabilityInput, AvailabilityResponse } from "../types";

const ACQUIRE_LOCK_SCRIPT = `
  -- 1. Check if target slug is taken by SOMEONE ELSE
  local owner = redis.call("GET", KEYS[2])
  if owner and owner ~= ARGV[1] then
      return 0 -- Taken
  end

  -- 2. Rolling Release: Handle previous reservation (optional cleanup for sequential checks)
  local oldSlug = redis.call("GET", KEYS[1])
  if oldSlug and oldSlug ~= ARGV[2] then
      local oldLockKey = "lock:workspace:" .. ARGV[3] .. ":project:" .. oldSlug
      local oldOwner = redis.call("GET", oldLockKey)
      if oldOwner == ARGV[1] then
          redis.call("DEL", oldLockKey) -- Release old lock
      end
  end

  -- 3. Acquire New Lock
  redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[4])
  redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[4])

  return 1 -- Success
`;

export const slugLogic = {
  checkSlugAvailability: async (
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

    // 3. Attempt Reservation via Redis Lua Script
    const userResKey = `user:reservation:${userId}:workspace:${workspaceId}`;
    const lockKey = `lock:workspace:${workspaceId}:project:${normalizedSlug}`;
    const ttl = 180; // 3 minutes reservation

    try {
      const result = await redis.eval(
        ACQUIRE_LOCK_SCRIPT,
        2,
        userResKey,
        lockKey,
        userId,
        normalizedSlug,
        workspaceId,
        ttl.toString()
      );

      if (result === 0) {
        // Lock held by someone else
        return {
          available: false,
          message: "Project key is currently reserved by another user",
          reason: "PROJECT_SLUG_RESERVATION_FAILED",
        };
      }

      return {
        available: true,
        reservationId: lockKey, // In this design, the lockKey itself acts as the proof, or we can sign it. Workspace used lockKey.
        message: "Project key reserved for 3 minutes",
      };
    } catch (_error) {
      throw new AppError("Internal Redis Error", "INTERNAL_SERVER_ERROR", 500);
    }
  },
};
