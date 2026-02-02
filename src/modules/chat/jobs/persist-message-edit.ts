import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { OutboxStatus } from "@prisma/client";

export interface PersistMessageEditJob {
  outboxId: string;
  messageId: string;
  content: string;
  editedAt: string;
  editorUserId: string;
}

/**
 * Persistence worker for message edit events
 * Idempotent: Checks outbox status before processing
 */
export const persistMessageEditWorker = async (
  job: Job<PersistMessageEditJob>
) => {
  const { outboxId, messageId, content, editedAt, editorUserId } = job.data;

  try {
    // Idempotency: Check outbox status
    const outbox = await db.messageEditOutbox.findUnique({
      where: { id: outboxId },
      select: { status: true },
    });

    if (!outbox) {
      logger.warn({ outboxId }, "Outbox record not found");
      return { success: false, reason: "outbox_not_found" };
    }

    if (outbox.status === OutboxStatus.DONE) {
      logger.info({ outboxId }, "Edit already persisted (duplicate job)");
      return { success: true, skipped: true };
    }

    // Transaction: Update message + outbox
    await db.$transaction(async (tx) => {
      // Update message
      await tx.chatMessage.update({
        where: {
          id: messageId,
          deletedAt: null, // Safety: don't update if message was deleted
        },
        data: {
          content,
          isEdited: true,
          editedAt: new Date(editedAt),
        },
      });

      // Update outbox
      await tx.messageEditOutbox.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.DONE,
          processedAt: new Date(),
        },
      });
    });

    logger.info({
      msg: "Message edit persisted",
      messageId,
      outboxId,
      jobId: job.id,
    });

    return { success: true };
  } catch (error: any) {
    // Handle message not found (deleted before persist)
    if (error.code === "P2025") {
      logger.warn({
        msg: "Message not found or deleted before edit could persist",
        messageId,
        outboxId,
        jobId: job.id,
      });

      // Mark outbox as failed (don't retry)
      await db.messageEditOutbox.update({
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
      "Failed to persist edit"
    );
    throw error; // BullMQ will retry
  }
};
