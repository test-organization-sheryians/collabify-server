import { WSHandlerContext } from "@/infra/ws/types";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { UnsubscribeBoardInput } from "./schema";
import { logger } from "@/shared/logger";

/**
 * Unsubscribe Board Handler
 *
 * User leaves a whiteboard session
 */
export const unsubscribeBoardHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: UnsubscribeBoardInput
) => {
  const { boardId } = input;
  const { userId } = socket.data;

  logger.info({
    msg: "Processing Unsubscribe Board",
    userId,
    boardId,
  });

  try {
    // TODO: V4 Architecture - Unsubscribe Board
    // ============================================
    //
    // STEP 1: Remove from Subscribers (Redis)
    // ---------------------------------------
    // - Remove user from Redis ZSET: board:{boardId}:subscribers
    // - Command: ZREM board:{boardId}:subscribers ${userId}
    //
    // STEP 2: Clean Up User State
    // ---------------------------
    // - Delete Redis Hash: board:{boardId}:user:{userId}:state
    // - Command: DEL board:{boardId}:user:{userId}:state
    //
    // STEP 3: Broadcast User Left
    // ---------------------------
    // - Broadcast to remaining subscribers:
    //   - Event: "whiteboard:user-left"
    //   - Payload: { boardId, userId, timestamp }
    // - Use Redis Pub/Sub channel: board:{boardId}:events
    //
    // STEP 4: Check Board Idle State
    // ------------------------------
    // - Get subscriber count: ZCARD board:{boardId}:subscribers
    // - If count === 0 (no active users):
    //   - Check last update time from Redis stream: XREVRANGE limit 1
    //   - If no updates in last 5 minutes:
    //     - Trigger cleanup job (queue: whiteboard-cleanup)
    //     - Job will: create snapshot, trim stream, archive if needed
    //
    // STEP 5: Send Acknowledgment
    // ---------------------------
    // - Send success frame to client confirming unsubscribe
    // - No ACK needed (fire-and-forget acceptable)
    //
    // ERROR HANDLING:
    // - Redis failure → log error but don't fail (client already leaving)
    // - Cleanup job failure → log error, retry in background
    //
    // ============================================

    throw new Error("TODO: Implement unsubscribe-board handler");
  } catch (err: unknown) {
    logger.error({ err, boardId }, "Failed to unsubscribe from board");

    // Don't send error to client - they're leaving anyway
    // Just log the error
  }
};
