import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { OutboxStatus } from "@prisma/client";

export interface PersistMessageDeleteJob {
  outboxId: string;
  messageId: string;
  deletedAt: string;
  deleterUserId: string;
}

/**
 * Persistence worker for message delete events
 * Idempotent: Checks outbox status before processing
 */
export const persistMessageDeleteWorker = async (
  job: Job<PersistMessageDeleteJob>
) => {
  const { outboxId, messageId, deletedAt, deleterUserId } = job.data;

  try {
    // Idempotency check
    const outbox = await db.messageDeleteOutbox.findUnique({
      where: { id: outboxId },
      select: { status: true },
    });

    if (!outbox) {
      logger.warn({ outboxId }, "Outbox record not found");
      return { success: false, reason: "outbox_not_found" };
    }

    if (outbox.status === OutboxStatus.DONE) {
      logger.info({ outboxId }, "Delete already persisted (duplicate job)");
      return { success: true, skipped: true };
    }

    // Transaction: Soft delete message + update outbox
    await db.$transaction(async (tx) => {
      // Soft delete message
      await tx.chatMessage.update({
        where: {
          id: messageId,
          deletedAt: null, // Only delete if not already deleted
        },
        data: {
          deletedAt: new Date(deletedAt),
        },
      });

      // Update outbox
      await tx.messageDeleteOutbox.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.DONE,
          processedAt: new Date(),
        },
      });
    });

    logger.info({
      msg: "Message delete persisted",
      messageId,
      outboxId,
      jobId: job.id,
    });

    return { success: true };
  } catch (error: any) {
    if (error.code === "P2025") {
      logger.warn({
        msg: "Message not found or already deleted",
        messageId,
        outboxId,
        jobId: job.id,
      });

      await db.messageDeleteOutbox.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.FAILED,
          processedAt: new Date(),
        },
      });

      return { success: false, reason: "message_not_found" };
    }

    logger.error(
      { error, messageId, outboxId, jobId: job.id },
      "Failed to persist delete"
    );
    throw error;
  }
};
