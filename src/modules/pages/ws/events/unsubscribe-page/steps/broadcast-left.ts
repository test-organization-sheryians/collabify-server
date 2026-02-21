/**
 * Step 5 — Broadcast Left
 *
 * Two best-effort operations (both fire even if first fails):
 *   a) PUBLISH page:user-left to all remaining subscribers.
 *   b) ACK the leaving socket with page:unsubscribe-success.
 *
 * WHY COMBINED: Both are terminal cleanup operations sharing the same
 * context. Both are best-effort (socket may be in CLOSING state).
 * Splitting into two files adds no testability benefit.
 *
 * ACK is wrapped in try/catch — socket.send() throws if socket is CLOSING.
 */

import { createSuccessFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import type { ChatWebSocket } from "@/infra/ws/types";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:unsubscribe-page:broadcast-left");

export async function broadcastLeft(
  pageId: string,
  userId: string,
  socket: ChatWebSocket,
  redis: Redis
): Promise<void> {
  const timestamp = Date.now();

  // a) PUBLISH user-left to remaining subscribers
  try {
    await redis.publish(
      PageKeys.PageEvents(pageId),
      JSON.stringify({
        message: createSuccessFrame(undefined, "page:user-left", {
          pageId,
          userId,
          timestamp,
        }),
        originSocketId: socket.data.socketId,
      })
    );
  } catch (err) {
    logger.error("Failed to broadcast user-left", { pageId, userId, err });
  }

  // b) ACK leaving socket (best-effort — may already be CLOSING)
  try {
    socket.send(
      createSuccessFrame(undefined, "page:unsubscribe-success", { pageId })
    );
  } catch {
    // Swallow silently — socket may be in CLOSING state
  }
}
