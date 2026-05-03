import { Job } from "bullmq";
import { db } from "@/infra/db";
import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { OutboxStatus } from "@prisma/client";
import { SendMessageInput } from "../ws/events/send-message/schema";
import { extractChatMentions } from "../lib/extract-chat-mentions";
import { createMentionRecord } from "@/modules/mention/services/create-mentions/steps/create-mention-record";
import { createBacklink } from "@/modules/mention/services/create-mentions/steps/create-backlink";
import { emitMentionCreatedEvent } from "@/modules/mention/services/create-mentions/steps/emit-events";
import { logMentionCreated } from "@/modules/mention/services/create-mentions/steps/log-audit";
import { determineTier } from "@/modules/mention/services/create-mentions/handler";

const logger = createLogger("chat:jobs:persist-message");
/**
 * Job Payload Contract
 */
interface PersistMessageJob extends SendMessageInput {
  outboxId: string;
  streamId: string;
  authorId: string;
  sequence: number; // NEW
}

/**
 * Worker Logic: Moves "Pending Intent" -> "Final Message"
 * Triggered by Stream Worker after sequencing.
 */
export const persistMessageHandler = async (job: Job<PersistMessageJob>) => {
  const {
    outboxId,
    streamId,
    sequence, // NEW
    conversationId,
    content,
    dedupeId,
    authorId,
    metadata,
    parentMessageId, // For inline replies (message-reference)
  } = job.data;

  logger.info("Persisting Message", {
    jobId: job.id,
    outboxId,
    streamId,
    sequence,
  });

  try {
    const txResult = await db.$transaction(async (tx) => {
      // 1. Validation Gate
      // ARCHITECTURE: Check-Then-Act pattern prevents "Blind Updates" and race conditions.
      const outboxEntry = await tx.outboxMessage.findUnique({
        where: { id: BigInt(outboxId) },
      });

      if (!outboxEntry) {
        logger.warn("Outbox row missing/cleaned. Aborting retry.", {
          outboxId,
        });
        return []; // Idempotent success
      }

      if (outboxEntry.status === "DONE") {
        logger.info("Outbox already DONE. Skipping.", { outboxId });
        return [];
      }

      // Integrity Check: Ensure Job matches Outbox context
      if (outboxEntry.conversationId !== conversationId) {
        throw new Error(
          `Integrity Error: Job Channel (${conversationId}) != Outbox Channel (${outboxEntry.conversationId})`
        );
      }

      // 1.5 Verify Author Existence (Eventual Consistency)
      // In distributed systems, a user might be deleted while a message is in flight.
      const author = await tx.user.findUnique({
        where: { id: authorId },
        select: { id: true },
      });

      if (!author) {
        logger.warn(
          "Message persistence failed: Author not found (Zombie User). Marking as FAILED.",
          { authorId, outboxId }
        );

        // TODO (Compliance): Implement Dead Letter Queue / Audit Log for compliance
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
        return [];
      }

      // 2. Create Final Message (Archive)
      // Idempotency Check: Prevent duplicate inserts if job retries
      // CHECK 1: By messageId (dedupeId)
      const existingById = await tx.chatMessage.findUnique({
        where: { id: dedupeId },
      });
      if (existingById) {
        logger.info("Message already persisted (by ID)", { dedupeId });
        return [];
      }

      // CHECK 2: By (conversationId, sequence) to prevent unique constraint violation
      const existingBySequence = await tx.chatMessage.findFirst({
        where: {
          conversationId,
          sequence,
        },
      });
      if (existingBySequence) {
        logger.warn(
          "Sequence already used by different message. Skipping to prevent constraint violation.",
          {
            conversationId,
            sequence,
            existingId: existingBySequence.id,
            newId: dedupeId,
          }
        );
        return [];
      }

      // TODO (Scale): Switch to `createMany` with Batch Processor if throughput > 1000 msg/sec
      await tx.chatMessage.create({
        data: {
          id: dedupeId,
          conversationId,
          authorUserId: authorId,
          streamId,
          sequence,
          content: {
            text: content,
            schemaVersion: 1,
          },
          type: "TEXT",
          parentMessageId, // For inline replies (null for top-level messages)
          metadata: (metadata || {}) as any,
        },
      });

      // Increment parent's reply count for inline replies (atomic in Postgres)
      if (parentMessageId) {
        await tx.chatMessage.update({
          where: { id: parentMessageId },
          data: { replyCount: { increment: 1 } },
        });
      }

      // 2.5 Update Conversation Last Sequence (Consistency Catch-up)
      // ARCHITECTURE: Dual-Write for Stability.
      // We rely on Redis for real-time ordering but must sync the "Committed Truth" to Postgres
      // to survive Redis cache evictions/crashes.
      await tx.chatConversation.update({
        where: { id: conversationId },
        data: {
          lastSequence: sequence,
        },
      });
      // TODO (Correctness): Use Raw Query with GREATEST(last_sequence, ?) to prevent flapping on out-of-order jobs

      // ── Step 2.5: Extract & persist chat mentions (Tier 3) ──────────────────
      // Content arrives as { text, schemaVersion } in the DB JSON field but the
      // original client content string (with embedded mentions JSON) is in `content`.
      // extractChatMentions handles both shapes and filters USER-type mentions.
      const mentionRefs = extractChatMentions(content);

      const persistedMentionRecords = [];

      if (mentionRefs.length > 0) {
        const minCtx = { db: tx }; // steps only need ctx.db

        for (const ref of mentionRefs) {
          try {
            const mentionInput = {
              sourceEntityId: dedupeId,
              sourceEntityType: "CHAT_MESSAGE",
              targetEntityId: ref.entityId,
              targetEntityType: ref.entityType,
              displayText: ref.displayText,
              sourceLocation: { fieldName: "content" },
            };

            const tier = determineTier("CHAT_MESSAGE", ref.entityType);
            const record = await createMentionRecord(
              mentionInput as any,
              authorId,
              tier,
              minCtx as any
            );

            await createBacklink(
              {
                sourceEntityId: dedupeId,
                sourceEntityType: "CHAT_MESSAGE",
                targetEntityId: ref.entityId,
                targetEntityType: ref.entityType,
                mentionId: record.id,
                displayText: ref.displayText,
              },
              minCtx as any
            );

            persistedMentionRecords.push(record);
            logger.debug("Chat mention persisted", {
              messageId: dedupeId,
              targetEntityId: ref.entityId,
              entityType: ref.entityType,
              tier,
            });
          } catch (mentionErr) {
            // Per plan: mention failure must NEVER fail the message persist.
            // Log and skip this mention.
            logger.error("Failed to persist chat mention (skipped)", {
              mentionErr,
              messageId: dedupeId,
              targetId: ref.entityId,
            });
          }
        }
      }

      // 3. Mark Intent as Done
      await tx.outboxMessage.update({
        where: { id: BigInt(outboxId) },
        data: {
          status: OutboxStatus.DONE,
          processedAt: new Date(),
        },
      });

      // Hand off records for post-tx side effects
      return persistedMentionRecords;
    });

    // ── Post-transaction: emit + audit (best-effort, outside tx) ────────────
    // These call Redis and write to MentionEvent — neither needs ACID guarantees.
    if (Array.isArray(txResult) && txResult.length > 0) {
      const postCtx = { db, redis: appRedis } as any;
      for (const record of txResult) {
        emitMentionCreatedEvent(record, postCtx).catch(() => {});
        logMentionCreated(record.id, record, postCtx).catch(() => {});
      }
    }

    logger.info("Message Persisted Successfully", { outboxId });
  } catch (err: any) {
    logger.error("Failed to persist message", { err, jobId: job.id });
    // BullMQ will retry
    throw err;
  }
};
