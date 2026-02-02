import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { OutboxStatus } from "@prisma/client";
import { persistenceQueue } from "./queues";

/**
 * Stuck-Record Recovery Job
 *
 * Purpose: Detect and re-enqueue PENDING records stuck due to worker crashes
 * Schedule: Every 2 minutes
 * Threshold: Records PENDING for > 5 minutes
 *
 * This job ensures messages don't get lost when:
 * - Worker process crashes
 * - Redis is temporarily down
 * - BullMQ queue stalls
 */
export const recoverStuckOutboxHandler = async (job: Job) => {
  const STUCK_THRESHOLD_MINUTES = 5;
  const stuckThreshold = new Date();
  stuckThreshold.setMinutes(
    stuckThreshold.getMinutes() - STUCK_THRESHOLD_MINUTES
  );

  logger.info({
    msg: "Starting stuck outbox recovery",
    jobId: job.id,
    threshold: stuckThreshold.toISOString(),
  });

  try {
    let totalRecovered = 0;

    // ═══════════════════════════════════════════════════════════
    // Recovery 1: OutboxMessage (send-message)
    // ═══════════════════════════════════════════════════════════
    const stuckSendMessages = await db.outboxMessage.findMany({
      where: {
        status: OutboxStatus.PENDING,
        createdAt: {
          lt: stuckThreshold,
        },
        processedAt: null,
      },
      take: 100, // Limit batch size
      select: {
        id: true,
        messageId: true,
        conversationId: true,
        payload: true,
      },
    });

    for (const record of stuckSendMessages) {
      // Re-enqueue to persistence queue
      // Note: The persistence worker is already idempotent
      await persistenceQueue.add(
        "persist-message",
        {
          outboxId: record.id.toString(),
          // Extract fields from payload
          ...(record.payload as any),
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      logger.warn({
        msg: "Re-enqueued stuck send-message",
        outboxId: record.id.toString(),
        messageId: record.messageId,
      });
    }

    totalRecovered += stuckSendMessages.length;

    // ═══════════════════════════════════════════════════════════
    // Recovery 2: MessageEditOutbox
    // ═══════════════════════════════════════════════════════════
    const stuckEdits = await db.messageEditOutbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        createdAt: {
          lt: stuckThreshold,
        },
        processedAt: null,
      },
      take: 100,
      select: {
        id: true,
        messageId: true,
        content: true,
        editedAt: true,
        editedBy: true,
      },
    });

    for (const record of stuckEdits) {
      await persistenceQueue.add(
        "persist-message-edit",
        {
          outboxId: record.id,
          messageId: record.messageId,
          content: record.content,
          editedAt: record.editedAt.toISOString(),
          editorUserId: record.editedBy,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      logger.warn({
        msg: "Re-enqueued stuck edit-message",
        outboxId: record.id,
        messageId: record.messageId,
      });
    }

    totalRecovered += stuckEdits.length;

    // ═══════════════════════════════════════════════════════════
    // Recovery 3: MessageDeleteOutbox
    // ═══════════════════════════════════════════════════════════
    const stuckDeletes = await db.messageDeleteOutbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        createdAt: {
          lt: stuckThreshold,
        },
        processedAt: null,
      },
      take: 100,
      select: {
        id: true,
        messageId: true,
        deletedAt: true,
        deletedBy: true,
      },
    });

    for (const record of stuckDeletes) {
      await persistenceQueue.add(
        "persist-message-delete",
        {
          outboxId: record.id,
          messageId: record.messageId,
          deletedAt: record.deletedAt.toISOString(),
          deleterUserId: record.deletedBy,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      logger.warn({
        msg: "Re-enqueued stuck delete-message",
        outboxId: record.id,
        messageId: record.messageId,
      });
    }

    totalRecovered += stuckDeletes.length;

    // ═══════════════════════════════════════════════════════════
    // Alert if stuck count is high (indicates worker issues)
    // ═══════════════════════════════════════════════════════════
    if (totalRecovered > 100) {
      logger.error({
        msg: "HIGH STUCK RECORD COUNT - Worker or queue issue!",
        totalRecovered,
        jobId: job.id,
      });
    } else if (totalRecovered > 0) {
      logger.warn({
        msg: "Stuck records detected and recovered",
        totalRecovered,
      });
    }

    logger.info({
      msg: "Stuck outbox recovery completed",
      jobId: job.id,
      totalRecovered,
      breakdown: {
        sendMessage: stuckSendMessages.length,
        editMessage: stuckEdits.length,
        deleteMessage: stuckDeletes.length,
      },
    });

    return {
      success: true,
      totalRecovered,
      breakdown: {
        sendMessage: stuckSendMessages.length,
        editMessage: stuckEdits.length,
        deleteMessage: stuckDeletes.length,
      },
    };
  } catch (error: any) {
    logger.error({
      msg: "Stuck outbox recovery failed",
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
};
