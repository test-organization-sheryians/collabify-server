/**
 * Step 1+2 — Check Auth
 *
 * Verifies two pre-conditions before any data enters the stream:
 *   1. User is subscribed to this page (ZSCORE — no DB hit)
 *   2. Page is not locked by a different user (GET — best-effort)
 *
 * WHY COMBINED: Both are pure Redis guard reads with no branching between
 * them. Splitting into two files would add an extra function call for a
 * single Redis operation each — not worth it on a <10ms hot path.
 *
 * Lock semantics: The lock key stores the locking user's ID (not "1").
 * The lock owner may still edit their own locked page.
 * Authoritative lock enforcement is in the GraphQL layer.
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:page-update:check-auth");

export async function checkAuth(
  pageId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  // Step 1 — Subscriber check (ZSCORE: O(log N), ~0.5ms)
  const isSubscribed = await redis.zscore(
    PageKeys.PageSubscribers(pageId),
    userId
  );

  if (isSubscribed === null) {
    logger.warn("Rejected — user not subscribed", { pageId, userId });
    throw new AppError(
      "You must subscribe to the page before sending updates",
      "NOT_SUBSCRIBED"
    );
  }

  // Step 2 — Lock check (GET: ~0.5ms, eventually consistent)
  // Authoritative enforcement lives in GraphQL — this is best-effort rate gate
  const lockOwner = await redis.get(PageKeys.PageLock(pageId));

  if (lockOwner && lockOwner !== userId) {
    logger.warn("Rejected — page locked by another user", {
      pageId,
      userId,
      lockOwner,
    });
    throw new AppError(
      "Page is currently locked by another user",
      "PAGE_LOCKED"
    );
  }
}
