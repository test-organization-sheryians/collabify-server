import { WSHandlerContext } from "@/infra/ws/core/types";
import { ChatDownstreamEvent } from "@/shared/contracts/chat/events";
import {
  GenericWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/core/types";
import { EditMessageInput } from "./schema";
import { logger } from "@/shared/logger";
import { appRedis } from "@/infra/redis";
import { KeyFactory } from "@/infra/redis/keys";
import { OutboxStatus } from "@prisma/client";
import { validateEditMessage } from "@/shared/validation/chat-permissions";
import { createHash } from "crypto";

export const editMessageHandler = async (
  ctx: WSHandlerContext,
  socket: GenericWebSocket,
  input: EditMessageInput
) => {
  const { messageId, content, nonce } = input;
  const { userId } = socket.data;

  logger.info({
    msg: "Processing Edit Message",
    userId,
    messageId,
    nonce,
  });

  try {
    // 1️⃣ VALIDATION (BEFORE OUTBOX WRITE)
    const validation = await validateEditMessage(ctx.db, userId, messageId);

    if (!validation.valid) {
      logger.warn(
        {
          userId,
          messageId,
          error: validation.error,
        },
        "Edit validation failed"
      );

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

    // 2️⃣ IDEMPOTENCY CHECK (Content Hash)
    const contentHash = createHash("sha256").update(content).digest("hex");
    const previousHash = createHash("sha256")
      .update(message.content as string)
      .digest("hex");

    if (contentHash === previousHash) {
      socket.send(
        createSuccessFrame(nonce, "chat:ack", {
          nonce,
          status: "duplicate",
          message: "Content unchanged",
        })
      );
      return;
    }

    // Check for duplicate nonce in outbox
    const existingOutbox = await ctx.db.messageEditOutbox.findUnique({
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
          message: "Edit already processed",
        })
      );
      return;
    }

    // 3️⃣ OUTBOX WRITE
    const editedAt = new Date();
    const outboxRecord = await ctx.db.messageEditOutbox.create({
      data: {
        messageId,
        content,
        editedBy: userId,
        editedAt,
        nonce,
        status: OutboxStatus.PENDING,
      },
      select: { id: true },
    });

    // 4️⃣ PUBLISH TO STREAM
    const streamKey = KeyFactory.ConversationStream(message.conversationId);
    const downstreamPayload = {
      type: ChatDownstreamEvent.MessageEdited,
      messageId,
      conversationId: message.conversationId,
      content,
      editedAt: editedAt.toISOString(),
      editorUserId: userId,
      isEdited: true,
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
      "editorUserId",
      userId,
      "outboxId",
      outboxRecord.id,
      "timestamp",
      editedAt.toISOString()
    );

    // 5️⃣ OPTIMISTIC ACK
    socket.send(
      createSuccessFrame(nonce, "chat:ack", {
        nonce,
        status: "ok",
        messageId,
        editedAt: editedAt.toISOString(),
      })
    );

    logger.info({
      msg: "Edit message published",
      messageId,
      userId,
      conversationId: message.conversationId,
      outboxId: outboxRecord.id,
    });
  } catch (error) {
    logger.error({ error, messageId, userId }, "Failed to edit message");
    socket.send(
      createErrorFrame(nonce, "chat:error", "INTERNAL_ERROR", "Internal error")
    );
  }
};
