/**
 * Acquire a short-lived Redis mutex lock for the onboarding flow.
 * Prevents concurrent requests from the same user creating duplicate workspaces.
 * Throws CONFLICT if lock is already held.
 */
import { AppError } from "@/shared/errors";
import { LockingService, createLockKeys } from "@/services/locking";
import type { Redis } from "ioredis";

export async function acquireOnboardingLock(
  userId: string,
  redis: Redis
): Promise<string> {
  const keys = createLockKeys("workspace");
  const userLockKey = keys.resource(`onboarding:${userId}`);
  const acquired = await LockingService.acquire(userLockKey, "1", 10);

  if (!acquired) {
    throw AppError.conflict(
      "Onboarding is already in progress. Please wait.",
      "IDEMPOTENCY_LOCKED"
    );
  }

  return userLockKey;
}
