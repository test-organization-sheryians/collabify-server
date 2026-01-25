import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { OutboxStatus } from "@prisma/client";
import { SendMessageInput } from "../ws/events/send-message/schema";

/**
 * Job Payload Contract
 */
interface PersistMessageJob extends SendMessageInput {
  outboxId: string;
  streamId: string;
  authorId: string;
  // conversationId, payload, dedupeId are in SendMessageInput (except conversationId is explicit here too)
}

/**
 * Worker Logic: Moves "Pending Intent" -> "Final Message"
 * Triggered by Stream Worker after sequencing.
 */
export const persistMessageHandler = async (job: Job<PersistMessageJob>) => {
  const {
    outboxId,
    streamId,
    conversationId,
    content,
    dedupeId,
    authorId,
    threadId,
    metadata,
  } = job.data;

  logger.info({ jobId: job.id, outboxId, streamId }, "Persisting Message");

  try {
    await db.$transaction(async (tx) => {
      // 1. Validation Gate (Integrity & Safety)
      // ARCHITECTURE DECISION: Check-Then-Act
      // Prevent "Blind Updates" (Retry Loops) and "Data Corruption"
      const outboxEntry = await tx.outboxMessage.findUnique({
        where: { id: BigInt(outboxId) },
      });

      if (!outboxEntry) {
        logger.warn(
          { outboxId },
          "Outbox row missing/cleaned. Aborting retry."
        );
        return; // Stop Retry Loop (Idempotent success)
      }

      if (outboxEntry.status === "DONE") {
        logger.info({ outboxId }, "Outbox already DONE. Skipping.");
        return;
      }

      // Integrity Check
      if (outboxEntry.conversationId !== conversationId) {
        throw new Error(
          `Integrity Error: Job Channel (${conversationId}) != Outbox Channel (${outboxEntry.conversationId})`
        );
      }

      // 2. Create Final Message (Archive)
      // Check if already exists (Idempotency via dedupeId as ID)
      const existing = await tx.chatMessage.findUnique({
        where: { id: dedupeId },
      });
      if (existing) {
        logger.info({ dedupeId }, "Message already persisted (Idempotency)");
        return;
      }

      await tx.chatMessage.create({
        data: {
          // TODO: @Optimization Switch 'id' to Server-Generated ULID (Phase M)
          id: dedupeId,
          conversationId,
          authorUserId: authorId,
          streamId,
          // Wrapped Content (Schema V1)
          content: {
            text: content,
            schemaVersion: 1,
          },
          type: "TEXT",
          parentMessageId: threadId,
          metadata: (metadata || {}) as any,
        },
      });

      // 2. Mark Intent as Done
      // We search by ID (BigInt) or messageId (String).
      // job.data.outboxId is String (from BigInt).
      await tx.outboxMessage.update({
        where: { id: BigInt(outboxId) },
        data: {
          status: OutboxStatus.DONE,
          processedAt: new Date(),
        },
      });
    });

    logger.info({ outboxId }, "Message Persisted Successfully");
  } catch (err: any) {
    logger.error({ err, jobId: job.id }, "Failed to persist message");
    // BullMQ will retry
    throw err;
  }
};
