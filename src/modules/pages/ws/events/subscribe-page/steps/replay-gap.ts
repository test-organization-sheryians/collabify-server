/**
 * Step 6 — Replay Gap
 *
 * Sends stream updates from (lastStreamId, +] to THIS socket only.
 * Closes the gap between the client's last known position and the current
 * stream head — needed after reconnect when client already has a snapshot.
 *
 * Skipped when lastStreamId is "0-0" (first open after GraphQL snapshot —
 * no gap to close since getPageSnapshot already included stream delta).
 *
 * Non-fatal: any failure is caught and logged. The state vector sync in
 * Phase 3 of usePageSync handles any remaining gap.
 */

import { createSuccessFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { ChatWebSocket } from "@/infra/ws/types";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:subscribe-page:replay-gap");

export async function replayGap(
  pageId: string,
  userId: string,
  lastStreamId: string,
  socket: ChatWebSocket,
  redis: Redis
): Promise<void> {
  if (!lastStreamId || lastStreamId === "0-0") return;

  try {
    const missing = (await redis.xrange(
      PageKeys.PageStream(pageId),
      `(${lastStreamId}`, // exclusive start — AFTER lastStreamId
      "+",
      "COUNT",
      5000
    )) as Array<[string, string[]]>;

    if (missing.length === 0) return;

    logger.info("Replaying gap", {
      pageId,
      userId,
      count: missing.length,
      from: lastStreamId,
    });

    for (const [id, fields] of missing) {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2)
        data[fields[i]] = fields[i + 1];

      socket.send(
        createSuccessFrame(undefined, "page:page-update", {
          pageId: data.pageId,
          streamId: id,
          update: data.update,
          userId: data.userId,
          timestamp: data.timestamp,
        })
      );
    }
  } catch (err) {
    // Non-fatal — state vector sync in usePageSync Phase 3 handles remaining gap
    logger.error("Replay gap failed (non-fatal)", { pageId, userId, err });
  }
}
