/**
 * Step 2 — Acquire Lock
 *
 * Atomically acquires the page editor lock using Redis SET NX EX.
 * Handles three cases:
 *
 *   A) Lock acquired → done (happy path)
 *   B) Lock held by another user → CONFLICT error
 *   C) Lock held by THIS user already → re-extend TTL (idempotent re-acquire)
 *
 * WHY SET NX (not a Lua script):
 * SET NX on a single key is atomic by definition — no cross-key atomicity needed.
 * Lua would add complexity with no safety benefit here.
 *
 * WHY TTL = 3600s:
 * Safety net for crashed clients. A lock auto-releases after 1h without an
 * explicit unlock-page call.
 */

import { AppError } from "@/shared/errors";
import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

const LOCK_TTL_SECONDS = 3600;

export async function acquireLock(
  pageId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const lockKey = PageKeys.PageLock(pageId);

  // Case A — attempt atomic acquisition
  const acquired = await redis.set(
    lockKey,
    userId,
    "EX",
    LOCK_TTL_SECONDS,
    "NX"
  );

  if (acquired) return; // acquired successfully

  // Lock is already held — check who holds it
  const lockHolder = await redis.get(lockKey);

  if (lockHolder && lockHolder !== userId) {
    // Case B — another user holds the lock
    throw AppError.conflict(
      "Another user currently holds the lock on this page"
    );
  }

  // Case C — we already hold the lock, re-extend TTL
  await redis.expire(lockKey, LOCK_TTL_SECONDS);
}
