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

      // 1.5 Verify Author Existence (Prevent FK Violation for Zombies)
      // SYSTEM DESIGN NOTE:
      // In a distributed system, the User might be deleted between the time the message was sent (Socket)
      // and the time it is processed (Worker). We must handle this "Eventual Consistency" gap.
      const author = await tx.user.findUnique({
        where: { id: authorId },
        select: { id: true },
      });

      if (!author) {
        logger.warn(
          { authorId, outboxId },
          "Message persistence failed: Author not found (Zombie User). Marking as FAILED."
        );

        // TODO: Implement a "Dead Letter Queue" or "Audit Log" for these failures if stricter compliance is needed.

        await tx.outboxMessage.update({
          where: { id: BigInt(outboxId) },
          data: {
            status: OutboxStatus.FAILED,
            processedAt: new Date(),
            errorLog: {
              message: "Author not found",
              code: "USER_NOT_FOUND",
              details:
                "User likely deleted after message was sent but before persistence.",
            } as any,
          },
        });
        return;
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

      // TODO: Performance Optimization
      // If throughput exceeds 1000 msg/sec, switch to `createMany` with a buffered Batch Processor.
      await tx.chatMessage.create({
        data: {
          // TODO: Switch to Server-Side ULID generation if client clock drift becomes an issue.
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

      // 3. Mark Intent as Done
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
