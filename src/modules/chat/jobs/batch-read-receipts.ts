import type { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";

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

  logger.info(
    { jobId: job.id, conversationId, userId, sequence },
    "Processing read receipt"
  );

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
        logger.warn(
          { conversationId, userId },
          "Member not found - user may have left conversation"
        );
        return; // Idempotent success - no retry needed
      }

      // 2. Idempotency check: Only update if sequence advanced
      if (sequence <= member.lastReadSeq) {
        logger.info(
          {
            conversationId,
            userId,
            current: member.lastReadSeq,
            new: sequence,
          },
          "Read receipt skipped - sequence not advanced"
        );
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

      logger.info(
        { conversationId, userId, watermarkId, sequence },
        "Read receipt persisted"
      );
    });
  } catch (error) {
    logger.error(
      { error, jobId: job.id, data: job.data },
      "Read receipt persistence failed"
    );
    throw error; // BullMQ will retry
  }
};
