import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { CursorMoveInput } from "./schema";
import { logger } from "@/shared/logger";

/**
 * Cursor Move Handler (EPHEMERAL)
 *
 * NOT persisted - broadcast only via Pub/Sub
 */
export const cursorMoveHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: CursorMoveInput
) => {
  const { boardId, x, y } = input;
  const { userId } = socket.data;

  try {
    // TODO V4 Architecture - Cursor Move (Ephemeral)
    // ============================================
    //
    // STEP 1: Validate Subscription
    // -----------------------------
    // - Check user is in Redis ZSET: board:{boardId}:subscribers
    // - ZSCORE board:{boardId}:subscribers ${userId}
    // - If not found → silently ignore (user not subscribed)
    //
    // STEP 2: Broadcast via Pub/Sub ONLY
    // ----------------------------------
    // - DO NOT write to Redis stream
    // - DO NOT write to Postgres
    // - Use Redis Pub/Sub channel: board:{boardId}:cursors
    // - PUBLISH board:{boardId}:cursors ${JSON.stringify({
    //     type: "whiteboard:cursor-update",
    //     data: { boardId, userId, x, y, timestamp: new Date().toISOString() }
    //   })}
    //
    // STEP 3: Update Cursor Position Cache (Optional)
    // -----------------------------------------------
    // - Set Redis Hash: board:{boardId}:cursor:{userId}
    // - HSET board:{boardId}:cursor:{userId} x ${x} y ${y}
    // - EXPIRE board:{boardId}:cursor:{userId} 5 (5 seconds TTL)
    // - This allows late joiners to see last cursor positions
    //
    // STEP 4: NO ACK Needed
    // ---------------------
    // - Fire-and-forget for performance
    // - Client assumes success (optimistic)
    //
    // ERROR HANDLING:
    // - Redis Pub/Sub failure → log error but don't fail
    // - This is ephemeral data, can tolerate loss
    //
    // ============================================
    // No-op for now - implement later
  } catch (err: unknown) {
    logger.error({ err, boardId }, "Failed to process cursor move");
    // Don't send error to client - this is ephemeral
  }
};
