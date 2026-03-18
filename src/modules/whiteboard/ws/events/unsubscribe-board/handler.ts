import { WSHandlerContext } from "@/infra/ws/types";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { UnsubscribeBoardInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:ws:unsubscribe");
import { WhiteboardKeys } from "@/modules/whiteboard/infra/whiteboard-keys";

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

  logger.info("Processing Unsubscribe Board", {
    userId,
    boardId,
  });

  try {
    // Step 1: Remove from subscribers list
    const subscribersKey = WhiteboardKeys.BoardSubscribers(boardId);
    await ctx.redis.zrem(subscribersKey, userId);

    // Step 2: Clean up user state
    const userStateKey = WhiteboardKeys.UserState(boardId, userId);
    await ctx.redis.del(userStateKey);

    // Step 3: Update subscriber count
    const presenceKey = WhiteboardKeys.BoardPresence(boardId);
    await ctx.redis.hincrby(presenceKey, "subscriberCount", -1);

    // Step 4: Broadcast user-left event to remaining subscribers
    const pubSubChannel = WhiteboardKeys.BoardEvents(boardId);
    const userLeftFrame = createSuccessFrame(
      undefined, // No request ID for broadcasts
      "whiteboard:user-left",
      {
        boardId,
        userId,
        timestamp: Date.now(),
      }
    );

    await ctx.redis.publish(pubSubChannel, userLeftFrame);

    logger.info("User unsubscribed from board", {
      userId,
      boardId,
    });

    // Note: Don't send ACK to client - they're leaving anyway
  } catch (err: unknown) {
    logger.error("Failed to unsubscribe from board", { err, boardId });

    // Don't send error to client - they're leaving anyway
    // Just log the error
  }
};
