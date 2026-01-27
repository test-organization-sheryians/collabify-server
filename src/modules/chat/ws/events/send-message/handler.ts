import { Context } from "hono";
import {
  ChatWebSocket,
  createSuccessFrame,
  createErrorFrame,
} from "@/infra/ws/types";
import { SendMessageInput } from "./schema";
import { logger } from "@/shared/logger";
import { appRedis } from "@/infra/redis";
import { OutboxStatus } from "@prisma/client";
import { KeyFactory } from "@/infra/redis/keys";

export const sendMessageHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: SendMessageInput
) => {
  const { conversationId, content, dedupeId } = input;
  const { userId } = socket.data;

  logger.info({
    msg: "Processing Send Message",
    userId,
    conversationId,
    dedupeId,
  });

  try {
    // 2. Intent: Insert into Outbox (Postgres)
    const outboxRecord = await ctx.db.outboxMessage.create({
      data: {
        messageId: dedupeId,
        conversationId,
        conversationType: "CHANNEL", // Default for now
        payload: input as any, // Json type
        status: OutboxStatus.PENDING,
      },
      select: { id: true },
    });

    const outboxId = outboxRecord.id.toString();
    const streamKey = KeyFactory.ConversationStream(conversationId);
    const signalKey = KeyFactory.ActiveConversations;
    const epochKey = KeyFactory.EpochConversations;

    const results = await appRedis
      .pipeline()
      .xadd(
        streamKey,
        "*",
        "conversationId",
        conversationId,
        "type",
        "chat:new-message", // Downstream Type (Fact)
        "payload",
        JSON.stringify(input),
        "dedupeId",
        dedupeId,
        "outboxId",
        outboxId,
        "authorId",
        userId
      )
      .eval(
        "if redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2]) == 1 then redis.call('INCR', KEYS[2]) end",
        2,
        signalKey,
        epochKey,
        Date.now(),
        conversationId
      )
      .exec();

    // 4. Capture Stream ID (Zero-Latency)
    // results[0] is [error, result] for XADD.
    // XADD returns the string ID.
    const xaddResult = results![0];
    const streamId = xaddResult[1] as string;

    // 5. Ack: Return Optimistic Success with Stream ID
    socket.send(
      createSuccessFrame(undefined, "chat:ack-message", {
        dedupeId,
        status: "sent",
        message: "Message sequenced",
        streamId, // <--- FAST PATH
      })
    );
  } catch (err: any) {
    logger.error({ err, dedupeId }, "Failed to process send-message");

    // Handle Duplicate Entry (Idempotency)
    if (err.code === "P2002") {
      // Prisma Unique Constraint
      socket.send(
        createSuccessFrame(undefined, "chat:ack-message", {
          dedupeId,
          status: "duplicate",
          message: "Message already processed",
        })
      );
      return;
    }

    socket.send(
      createErrorFrame(
        undefined,
        "chat:ack-message",
        "INTERNAL_ERROR",
        "Failed to process message"
      )
    );
  }
};
