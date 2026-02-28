/**
 * Step 3 — Bump Epoch
 *
 * Increments sys:pages:epoch when the last subscriber leaves.
 * Stream worker instances watch this key via polling and re-partition their
 * active page set when it changes — removing deactivated pages from consumption.
 *
 * Only called when cleanupPresence() returned 1 (page was deactivated).
 * Best-effort — epoch drift is self-healing on next worker cycle.
 */

import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:unsubscribe-page:bump-epoch");

export async function bumpEpoch(pageId: string, redis: Redis): Promise<void> {
  try {
    await redis.incr(PageKeys.SysPagesEpoch());
    logger.info("Page deactivated — epoch bumped", { pageId });
  } catch (err) {
    logger.error("Failed to bump epoch", { pageId, err });
  }
}
