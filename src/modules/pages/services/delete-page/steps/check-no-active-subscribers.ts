/**
 * Step 2 — Check No Active Subscribers
 *
 * Guards against deleting a page while collaborators are actively editing.
 * Uses ZCARD on the PageSubscribers ZSET — a non-zero count means at least
 * one WebSocket session is subscribed to the page.
 *
 * WHY this guard exists:
 * If we allow deletion while users are editing, their in-flight updates would
 * append to the stream of a soft-deleted page, creating orphaned stream entries
 * with no consumer. The subscriber guard forces the deleting user to wait until
 * all other sessions are closed.
 */

import { AppError } from "@/shared/errors";
import { PageKeys } from "../../../infra/page-keys";
import type { Redis } from "ioredis";

export async function checkNoActiveSubscribers(
  pageId: string,
  redis: Redis
): Promise<void> {
  const activeCount = await redis.zcard(PageKeys.PageSubscribers(pageId));
  if (activeCount > 0) {
    throw AppError.conflict(
      "Cannot delete a page while collaborators are actively editing"
    );
  }
}
