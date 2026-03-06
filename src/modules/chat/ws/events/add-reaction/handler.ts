import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { AddReactionInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:add-reaction");
import { addReaction } from "@/modules/chat/domain/reactions/redis-helpers";
import { KeyFactory } from "@/infra/redis/keys";

export const addReactionHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: AddReactionInput
) => {
  const { messageId, emoji, tempId } = input;
  const { userId } = socket.data;

  try {
    // 1. Verify message exists and get conversationId
    const message = await ctx.db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });

    if (!message) {
      socket.send(
        createErrorFrame(
          tempId || messageId,
          "chat:add-reaction",
          "MESSAGE_NOT_FOUND",
          "Message not found"
        )
      );
      return;
    }

    // 2. Verify user is conversation member
    const membership = await ctx.db.chatMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      socket.send(
        createErrorFrame(
          tempId || messageId,
          "chat:add-reaction",
          "FORBIDDEN",
          "Not a conversation member"
        )
      );
      return;
    }

    // 3. Add reaction to Redis (Lua script - atomic)
    const { added } = await addReaction(ctx.redis, {
      messageId,
      userId,
      emoji,
      conversationId: message.conversationId,
    });

    // 4. Send ACK to client
    socket.send(
      createSuccessFrame(tempId, "chat:reaction-ack", {
        messageId,
        emoji,
        status: added ? "added" : "duplicate",
      })
    );

    // 5. Fan-out to all conversation members (if added)
    if (added) {
      const topic = KeyFactory.ConversationTopic(message.conversationId);

      try {
        await ctx.redis.publish(
          topic,
          JSON.stringify({
            type: "chat:reaction-added",
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
        logger.error("Failed to publish reaction-added event via Pub/Sub", {
          error: pubsubError,
          messageId,
          userId,
          emoji,
        });
      }

      logger.info("Reaction added", { messageId, userId, emoji });
    }
  } catch (error: any) {
    logger.error("Failed to add reaction", {
      error,
      messageId,
      userId,
      emoji,
    });
    socket.send(
      createErrorFrame(
        tempId || messageId,
        "chat:add-reaction",
        "INTERNAL_ERROR",
        "Failed to add reaction"
      )
    );
  }
};
