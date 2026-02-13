import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { RemoveReactionInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:remove-reaction");
import { removeReaction } from "@/modules/chat/domain/reactions/redis-helpers";
import { KeyFactory } from "@/infra/redis/keys";

export const removeReactionHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: RemoveReactionInput
) => {
  const { messageId, emoji } = input;
  const { userId } = socket.data;

  try {
    // 1. Get conversationId
    const message = await ctx.db.chatMessage.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      socket.send(
        createErrorFrame(
          messageId,
          "chat:remove-reaction",
          "MESSAGE_NOT_FOUND",
          "Message not found"
        )
      );
      return;
    }

    // 2. Remove reaction from Redis (Lua script - atomic)
    const { removed } = await removeReaction(ctx.redis, {
      messageId,
      userId,
      emoji,
      conversationId: message.conversationId,
    });

    // 3. Send ACK
    socket.send(
      createSuccessFrame(undefined, "chat:reaction-ack", {
        messageId,
        emoji,
        status: removed ? "removed" : "not_found",
      })
    );

    // 4. Fan-out if removed
    if (removed) {
      const topic = KeyFactory.ConversationTopic(message.conversationId);

      try {
        await ctx.redis.publish(
          topic,
          JSON.stringify({
            type: "chat:reaction-removed",
            data: {
              messageId,
              userId,
              emoji,
              timestamp: Date.now(),
            },
          })
        );
      } catch (pubsubError: any) {
        // Log but don't fail - event is in Redis, delta sync will catch it
        logger.error("Failed to publish reaction-removed event via Pub/Sub", {
          error: pubsubError,
          messageId,
          userId,
          emoji,
        });
      }

      logger.info("Reaction removed", { messageId, userId, emoji });
    }
  } catch (error: any) {
    logger.error("Failed to remove reaction", {
      error,
      messageId,
      userId,
      emoji,
    });
    socket.send(
      createErrorFrame(
        messageId,
        "chat:remove-reaction",
        "INTERNAL_ERROR",
        "Failed to remove reaction"
      )
    );
  }
};
