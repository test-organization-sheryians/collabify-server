import { redis } from "@/infra/redis";
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
        "BAD_REQUEST",
        429
      );
    }

    const normalizedSlug = slug.toLowerCase();

    // 1. Check Permanent Cache
    const existsCache = await redis.get(`workspace:exists:${normalizedSlug}`);
    if (existsCache) {
      return { available: false, message: "Workspace already exists" };
    }

    // 2. Check Lock
    const lockKey = `reserve:slug:${normalizedSlug}`;
    const reservedBy = await redis.get(lockKey);
    if (reservedBy && reservedBy !== userId) {
      return { available: false, message: "Slug is currently reserved" };
    }

    // 3. Check Permanent DB
    const existingDB = await db.workspace.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existingDB) {
      return { available: false, message: "Workspace already exists" };
    }

    // 4. Auto-Reserve (Rolling Release)
    const userResKey = `user:reservation:${userId}`;
    const oldSlug = await redis.get(userResKey);

    if (oldSlug && oldSlug !== normalizedSlug) {
      await redis.del(`reserve:slug:${oldSlug}`);
    }

    // Acquire new lock
    await redis.set(lockKey, userId, "EX", 180, "NX");
    await redis.set(userResKey, normalizedSlug, "EX", 180);

    return {
      available: true,
      reservationId: lockKey,
    };
  },
};
