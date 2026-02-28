import { WSHandlerContext } from "@/infra/ws/types";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { DeleteMessageInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:delete-message");
import { appRedis } from "@/infra/redis";
import { KeyFactory } from "@/infra/redis/keys";
import { OutboxStatus } from "@prisma/client";
import { validateDeleteMessage } from "@/shared/validation/chat-permissions";

export const deleteMessageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: DeleteMessageInput
) => {
  const { messageId, nonce } = input;
  const { userId } = socket.data;

  logger.info("Processing Delete Message", {
    userId,
    messageId,
    nonce,
  });

  try {
    // 1️⃣ VALIDATION
    const validation = await validateDeleteMessage(ctx.db, userId, messageId);

    if (!validation.valid) {
      logger.warn("Delete validation failed", {
        userId,
        messageId,
        error: validation.error,
      });

      socket.send(
        createErrorFrame(
          nonce,
          "chat:error",
          validation.error!.code,
          validation.error!.message
        )
      );
      return;
    }

    const message = validation.message!;

    // 2️⃣ IDEMPOTENCY CHECK
    const existingOutbox = await ctx.db.messageDeleteOutbox.findUnique({
      where: {
        messageId_nonce: {
          messageId,
          nonce,
        },
      },
    });

    if (existingOutbox) {
      socket.send(
        createSuccessFrame(nonce, "chat:ack", {
          nonce,
          status: "duplicate",
          message: "Delete already processed",
        })
      );
      return;
    }

    // 3️⃣ OUTBOX WRITE
    const deletedAt = new Date();
    const outboxRecord = await ctx.db.messageDeleteOutbox.create({
      data: {
        messageId,
        deletedBy: userId,
        deletedAt,
        nonce,
        status: OutboxStatus.PENDING,
      },
      select: { id: true },
    });

    // 4️⃣ PUBLISH TO STREAM
    const streamKey = KeyFactory.ConversationStream(message.conversationId);
    const downstreamPayload = {
      type: "chat:message-deleted",
      messageId,
      conversationId: message.conversationId,
      deletedAt: deletedAt.toISOString(),
      deleterUserId: userId,
      outboxId: outboxRecord.id,
    };

    await appRedis.xadd(
      streamKey,
      "*",
      "type",
      downstreamPayload.type,
      "payload",
      JSON.stringify(downstreamPayload),
      "messageId",
      messageId,
      "conversationId",
      message.conversationId,
      "deleterUserId",
      userId,
      "outboxId",
      outboxRecord.id,
      "timestamp",
      deletedAt.toISOString()
    );

    // 5️⃣ OPTIMISTIC ACK
    socket.send(
      createSuccessFrame(nonce, "chat:ack", {
        nonce,
        status: "ok",
        messageId,
        deletedAt: deletedAt.toISOString(),
      })
    );

    logger.info("Delete message published", {
      messageId,
      userId,
      conversationId: message.conversationId,
      outboxId: outboxRecord.id,
    });
  } catch (error) {
    logger.error("Failed to delete message", { error, messageId, userId });
    socket.send(
      createErrorFrame(nonce, "chat:error", "INTERNAL_ERROR", "Internal error")
    );
  }
};
