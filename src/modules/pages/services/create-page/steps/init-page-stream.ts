/**
 * Step: Init Page Stream
 *
 * Bootstraps the Redis stream + consumer group for this page.
 *
 * Why at creation time (not lazily on first update):
 * If the stream doesn't exist when the first page-update WS event arrives,
 * XADD auto-creates the stream but the consumer group won't exist.
 * The stream worker won't see the page until the next epoch bump, creating
 * a window where early updates are lost. Bootstrapping here closes that window.
 *
 * NON-FATAL: Stream bootstrap failure must NEVER roll back a fully committed page.
 * The system design states that subscribe-page recreates the consumer group on first
 * connection — so a Redis blip here is self-healing.
 *
 * BUSYGROUP error = group already exists — idempotent, always safe to ignore.
 */

import { createLogger } from "@/shared/lib/logger";
import { appRedis } from "@/infra/redis";
import { PageKeys } from "../../../infra/page-keys";

const logger = createLogger("pages:services:create-page");

const CONSUMER_GROUP = "page-workers";

export async function initPageStream(pageId: string): Promise<void> {
  const streamKey = PageKeys.PageStream(pageId);

  try {
    await appRedis.xgroup("CREATE", streamKey, CONSUMER_GROUP, "0", "MKSTREAM");
    logger.info("Redis stream bootstrapped", { pageId, streamKey });
  } catch (err) {
    const e = err as Error;
    // BUSYGROUP = group already exists — idempotent, silently ignored
    if (e.message?.includes("BUSYGROUP")) return;

    // Non-fatal: subscribe-page recreates the consumer group on first connection.
    // A Redis blip at creation time must not delete an otherwise-valid page row.
    logger.warn("Stream bootstrap failed — lazily created on first subscribe", {
      pageId,
      streamKey,
      err,
    });
  }
}
