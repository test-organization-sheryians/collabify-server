import { createLogger } from "@/shared/lib/logger";
import { createSuccessFrame } from "@/infra/ws/types";
import { PageKeys } from "../../../infra/page-keys";
import type { WSHandlerContext, ChatWebSocket } from "@/infra/ws/types";
import type { AwarenessUpdateInput } from "./schema";

const logger = createLogger("pages:ws:awareness-update");

/**
 * awarenessUpdate — WS Event Handler (ephemeral hot path, <5ms target)
 *
 * Execution order:
 *   1. Silent auth  — ZSCORE subscriber check (no error frame on failure)
 *   2. PUBLISH      — page:{id}:awareness (no ACK, no stream, fire-and-forget)
 *
 * No steps/ folder — only 2 Redis ops with no forking logic between them.
 * No ACK, no stream write, no Lua — awareness is purely ephemeral.
 *
 * See README.md for full system design and channel isolation rationale.
 */
export const awarenessUpdateHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: AwarenessUpdateInput
): Promise<void> => {
  const { pageId, update } = input;
  const { userId, socketId } = socket.data;

  // 1. Silent auth — not subscribed = silently drop (no error frame)
  // Awareness is fire-and-forget; an error frame for stale state wastes bandwidth.
  const isSubscribed = await ctx.redis.zscore(
    PageKeys.PageSubscribers(pageId),
    userId
  );

  if (isSubscribed === null) {
    logger.debug("Awareness dropped — user not subscribed", { pageId, userId });
    return;
  }

  // 2. Publish to awareness channel wrapped in the standard redis-subscriber envelope:
  //    { message: <WS frame string>, originSocketId } — subscriber extracts these and
  //    passes `message` directly to socket.send(), excluding the originating socket.
  try {
    // createSuccessFrame produces { type, success: true, data } — the format
    // connection-manager validates (requires typeof success === 'boolean').
    const frame = createSuccessFrame(undefined, "page:awareness-update", {
      pageId,
      update,
      userId,
    });

    await ctx.redis.publish(
      PageKeys.PageAwareness(pageId),
      JSON.stringify({ message: frame, originSocketId: socketId })
    );

    logger.debug("Awareness published", { pageId, userId });
  } catch (err) {
    // PUBLISH failure is silently absorbed — awareness is ephemeral.
    // Next cursor move will self-heal for all subscribers.
    logger.error("Awareness PUBLISH failed", { err, pageId, userId });
  }
};
