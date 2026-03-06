/**
 * Step 4 — Clean User State
 *
 * DEL page:{pageId}:user-state:{userId} — removes ephemeral per-user state
 * stored during the session (e.g. cursor position, draft state).
 *
 * Best-effort — if this fails the key will expire on its own TTL.
 */

import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:unsubscribe-page:clean-user-state");

export async function cleanUserState(
  pageId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  try {
    await redis.del(PageKeys.PageUserState(pageId, userId));
  } catch (err) {
    logger.error("Failed to clean user state", { pageId, userId, err });
  }
}
