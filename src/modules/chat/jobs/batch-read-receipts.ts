import type { Job } from "bullmq";
import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:jobs:batch-read-receipts");

/**
 * Read Receipt Job Payload
 * Queued when user marks messages as read via WebSocket
 */
export interface ReadReceiptJobData {
  conversationId: string;
  userId: string;
  watermarkId: string; // Last message ID read
  sequence: number; // Last sequence read
}

/**
 * Read Receipt Worker Handler
 * Batched persistence of read watermarks to ChatMember table
 *
 * Features:
 * - Idempotency: Prevents redundant updates if sequence hasn't advanced
 * - Batching: 5s delay allows coalescing multiple mark-read events
 */
export const readReceiptHandler = async (job: Job<ReadReceiptJobData>) => {
  const { conversationId, userId, watermarkId, sequence } = job.data;

  logger.info("Processing read receipt", {
    jobId: job.id,
    conversationId,
    userId,
    sequence,
  });

  try {
    await db.$transaction(async (tx) => {
      // 1. Fetch current member state
      const member = await tx.chatMember.findFirst({
        where: { conversationId, userId },
        select: {
          lastReadSeq: true,
        },
      });

      if (!member) {
        logger.warn("Member not found - user may have left conversation", {
          conversationId,
          userId,
        });
        return; // Idempotent success - no retry needed
      }

      // 2. Idempotency check: Only update if sequence advanced
      if (sequence <= member.lastReadSeq) {
        logger.info("Read receipt skipped - sequence not advanced", {
          conversationId,
          userId,
          current: member.lastReadSeq,
          new: sequence,
        });
        return;
      }

      // 3. Update read watermark
      await tx.chatMember.updateMany({
        where: { conversationId, userId },
        data: {
          lastReadMsgId: watermarkId,
          lastReadSeq: sequence,
          lastReadAt: new Date(),
        },
      });

      logger.info("Read receipt persisted", {
        conversationId,
        userId,
        watermarkId,
        sequence,
      });
    });
  } catch (error) {
    logger.error("Read receipt persistence failed", {
      error,
      jobId: job.id,
      data: job.data,
    });
    throw error; // BullMQ will retry
  }
};
