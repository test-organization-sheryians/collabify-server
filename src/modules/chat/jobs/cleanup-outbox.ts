import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { OutboxStatus } from "@prisma/client";

/**
 * Outbox Cleanup Job
 *
 * Purpose: Delete old COMPLETED outbox records to prevent table bloat
 * Schedule: Every 6 hours
 * Retention: 7 days
 *
 * This job maintains query performance by removing processed records
 * while keeping recent history for debugging.
 */
export const cleanupOutboxHandler = async (job: Job) => {
  const RETENTION_DAYS = 7;
  const BATCH_SIZE = 1000;
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);

  logger.info({
    msg: "Starting outbox cleanup",
    jobId: job.id,
    retentionDate: retentionDate.toISOString(),
  });

  try {
    let totalDeleted = 0;

    // ═══════════════════════════════════════════════════════════
    // Cleanup 1: OutboxMessage (send-message)
    // ═══════════════════════════════════════════════════════════
    const sendMessageDeleted = await db.outboxMessage.deleteMany({
      where: {
        status: OutboxStatus.DONE,
        processedAt: {
          lt: retentionDate,
        },
      },
    });
    totalDeleted += sendMessageDeleted.count;

    logger.info({
      table: "OutboxMessage",
      deleted: sendMessageDeleted.count,
    });

    // ═══════════════════════════════════════════════════════════
    // Cleanup 2: MessageEditOutbox (edit-message)
    // ═══════════════════════════════════════════════════════════
    const editOutboxDeleted = await db.messageEditOutbox.deleteMany({
      where: {
        status: OutboxStatus.DONE,
        processedAt: {
          lt: retentionDate,
        },
      },
    });
    totalDeleted += editOutboxDeleted.count;

    logger.info({
      table: "MessageEditOutbox",
      deleted: editOutboxDeleted.count,
    });

    // ═══════════════════════════════════════════════════════════
    // Cleanup 3: MessageDeleteOutbox (delete-message)
    // ═══════════════════════════════════════════════════════════
    const deleteOutboxDeleted = await db.messageDeleteOutbox.deleteMany({
      where: {
        status: OutboxStatus.DONE,
        processedAt: {
          lt: retentionDate,
        },
      },
    });
    totalDeleted += deleteOutboxDeleted.count;

    logger.info({
      table: "MessageDeleteOutbox",
      deleted: deleteOutboxDeleted.count,
    });

    // ═══════════════════════════════════════════════════════════
    // Alert if deletion count is suspiciously high
    // ═══════════════════════════════════════════════════════════
    if (totalDeleted > 10000) {
      logger.warn({
        msg: "High outbox deletion count - potential issue?",
        totalDeleted,
        jobId: job.id,
      });
    }

    logger.info({
      msg: "Outbox cleanup completed",
      jobId: job.id,
      totalDeleted,
      duration: `${Date.now() - job.timestamp}ms`,
    });

    return {
      success: true,
      totalDeleted,
      breakdown: {
        sendMessage: sendMessageDeleted.count,
        editMessage: editOutboxDeleted.count,
        deleteMessage: deleteOutboxDeleted.count,
      },
    };
  } catch (error: any) {
    logger.error({
      msg: "Outbox cleanup failed",
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
};
