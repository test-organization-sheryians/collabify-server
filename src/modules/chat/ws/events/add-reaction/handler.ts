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
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const addReactionHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: AddReactionInput
) => {
  const { messageId, emoji, tempId } = input;
  const { userId } = socket.data;

  try {
    // 0. Authorization
    if (!ctx.authGate) {
      socket.send(createErrorFrame(tempId || messageId, "chat:add-reaction", "UNAUTHORIZED", "Not authenticated"));
      return;
    }

    // 1. Verify message exists and get conversationId
    const message = await ctx.db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, deletedAt: true },
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

    // 1b. Block reactions on deleted messages
    if (message.deletedAt) {
      socket.send(
        createErrorFrame(
          tempId || messageId,
          "chat:add-reaction",
          "MESSAGE_DELETED",
          "Cannot react to a deleted message"
        )
      );
      return;
    }

    // 1c. Gate access by conversation membership (cache-backed)
    await ctx.authGate.assertChannelMember(message.conversationId);

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

      // Emit notification for reaction added
      emit(ctx.db as any, {
        type: "chat.reaction.added",
        payload: {
          messageId,
          conversationId: message.conversationId,
          conversationName: null,
          workspaceId: "",
          workspaceSlug: "",
          messageAuthorId: message.id,
          actorId: userId,
          actorName: "",
          emoji,
        } as any,
      }).catch((err) => logger.warn("chat.reaction.added emit failed", { err, messageId, emoji }));
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
