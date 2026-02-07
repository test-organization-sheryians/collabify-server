import { WSHandlerContext } from "@/infra/ws/types";
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
import { validateReplyParent } from "@/shared/validation/chat-permissions";

export const sendMessageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SendMessageInput
) => {
  const { conversationId, content, dedupeId, parentMessageId } = input;
  const { userId } = socket.data;

  logger.info({
    msg: "Processing Send Message",
    userId,
    conversationId,
    dedupeId,
  });

  try {
    // 1. Idempotency Check (Double Spend Protection)
    const existing = await ctx.db.outboxMessage.findUnique({
      where: { messageId: dedupeId },
      select: { id: true, status: true },
    });

    if (existing) {
      logger.warn({ dedupeId }, "Duplicate intent detected. Idempotent ACK.");
      socket.send(
        createSuccessFrame(undefined, "chat:ack-message", {
          dedupeId,
          status: "duplicate",
          message: "Message already accepted",
        })
      );
      return;
    }

    // 1.5. Validate Parent Message (if replying)
    if (parentMessageId) {
      const parentValidation = await validateReplyParent(
        ctx.db,
        parentMessageId,
        conversationId
      );

      if (!parentValidation.valid) {
        logger.warn({
          msg: "Invalid parent message reference",
          code: parentValidation.error?.code,
          parentMessageId,
        });
        socket.send(
          createErrorFrame(
            dedupeId,
            "chat:send-message",
            parentValidation.error?.code || "INVALID_PARENT",
            parentValidation.error?.message || "Invalid parent message"
          )
        );
        return;
      }
    }

    // 2. Persist Intent to Outbox (Postgres)
    const outboxRecord = await ctx.db.outboxMessage.create({
      data: {
        messageId: dedupeId,
        conversationId,
        conversationType: input.conversationType || "CHANNEL",
        payload: input as any,
        status: OutboxStatus.PENDING,
      },
      select: { id: true },
    });
    const outboxId = outboxRecord.id.toString();

    // 3. Prepare Atomic Operation
    const streamKey = KeyFactory.ConversationStream(conversationId);
    const seqKey = KeyFactory.ConversationSequence(conversationId);

    const basePayload = {
      conversationId,
      type: "chat:new-message",
      payload: JSON.stringify(input),
      dedupeId,
      outboxId,
      authorId: userId,
      createdAt: new Date().toISOString(),
    };

    // ARCHITECTURE: Cache-Aside Pattern for Atomicity
    // We attempt to increment via Lua. If the key is missing (Cold Start / Eviction),
    // we re-hydrate from Postgres and retry.
    let result: { streamId: string; sequence: number } | null = null;
    let attempts = 0;

    while (attempts < 2) {
      attempts++;

      // TODO: Move this Lua script to `src/infra/redis/lua/publish_message.lua` and load at startup
      const luaResponseStr = (await appRedis.eval(
        `
        local seq_key = KEYS[1]
        local stream_key = KEYS[2]
        local conversation_id = ARGV[1]
        local payload = cjson.decode(ARGV[2])

        if redis.call("EXISTS", seq_key) == 0 then
            return cjson.encode({err = "LOAD_REQUIRED"})
        end

        local next_seq = redis.call("INCR", seq_key)
        
        -- Construct XADD args with FLAT fields (Worker Expectation)
        local xadd_args = {
            "XADD", stream_key, "*",
            "conversationId", payload.conversationId,
            "type", payload.type,
            "payload", payload.payload,     -- Inner content JSON
            "dedupeId", payload.dedupeId,
            "outboxId", payload.outboxId,
            "authorId", payload.authorId,
            "createdAt", payload.createdAt,
            "sequence", next_seq            -- Dual-Sequencing: The Sequence Number
        }
        
        local stream_id = redis.call(unpack(xadd_args))
        
        return cjson.encode({ streamId = stream_id, sequence = next_seq })
        `,
        2,
        seqKey,
        streamKey,
        conversationId,
        JSON.stringify(basePayload)
      )) as string;

      const luaResponse = JSON.parse(luaResponseStr);

      if (luaResponse.err === "LOAD_REQUIRED") {
        logger.warn({ conversationId }, "Sequence Key missing. Re-hydrating.");

        const conversation = await ctx.db.chatConversation.findUnique({
          where: { id: conversationId },
          select: { lastSequence: true },
        });

        // Re-hydrate Redis
        const startSeq = conversation?.lastSequence || 0;
        await appRedis.set(seqKey, startSeq.toString());
        continue;
      }

      result = luaResponse;
      break;
    }

    if (!result) {
      throw new Error("Failed to publish after re-hydration attempt");
    }

    const { streamId, sequence } = result;

    // 4. Optimistic Ack
    socket.send(
      createSuccessFrame(undefined, "chat:ack-message", {
        dedupeId,
        status: "sent",
        message: "Message sequenced",
        streamId,
        sequence,
      })
    );
  } catch (err: any) {
    logger.error({ err, dedupeId }, "Failed to process send-message");

    // ... Error Handling (Same as before) ...
    if (err.code === "P2002") {
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
