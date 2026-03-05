/**
 * Enforce rate limit for slug availability checks.
 * Throws 429 if the user has exceeded MAX_REQUESTS within WINDOW_SECONDS.
 */
import { AppError } from "@/shared/errors";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";
import { checkRateLimit } from "@/shared/utils/rate-limiter";
import { createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

export async function enforceRateLimit(
  userId: string,
  redis: Redis
): Promise<void> {
  const keys = createLockKeys("workspace");
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
}
