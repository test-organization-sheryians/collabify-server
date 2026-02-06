import { Job } from "bullmq";
import { db } from "@/infra/db";
import { logger } from "@/shared/logger";

export interface PersistReactionsJob {
  reactions: Array<{
    messageId: string;
    userId: string;
    emoji: string;
    timestamp: number;
    action: "add" | "remove";
  }>;
}

export const persistReactionsHandler = async (
  job: Job<PersistReactionsJob>
) => {
  const { reactions } = job.data;

  const toAdd = reactions.filter((r) => r.action === "add");
  const toRemove = reactions.filter((r) => r.action === "remove");

  // Batch insert
  if (toAdd.length > 0) {
    // ✅ M-3: Verify messages exist before persisting
    const messageIds = [...new Set(toAdd.map((r) => r.messageId))];
    const existingMessages = await db.chatMessage.findMany({
      where: {
        id: { in: messageIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    const validMessageIds = new Set(existingMessages.map((m) => m.id));
    const reactionsWithValidMessages = toAdd.filter((r) =>
      validMessageIds.has(r.messageId)
    );

    if (reactionsWithValidMessages.length === 0) {
      logger.info("No valid messages found for reactions");
      return;
    }

    // ✅ M-5: Verify users exist
    const userIds = [
      ...new Set(reactionsWithValidMessages.map((r) => r.userId)),
    ];
    const existingUsers = await db.user.findMany({
      where: {
        id: { in: userIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    const validUserIds = new Set(existingUsers.map((u) => u.id));
    const fullyValidReactions = reactionsWithValidMessages.filter((r) =>
      validUserIds.has(r.userId)
    );

    if (fullyValidReactions.length === 0) {
      logger.info("No valid users found for reactions");
      return;
    }

    await db.messageReaction.createMany({
      data: fullyValidReactions.map((r) => ({
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: new Date(r.timestamp),
      })),
      skipDuplicates: true, // Handle race conditions
    });

    const skipped = toAdd.length - fullyValidReactions.length;
    if (skipped > 0) {
      logger.warn(
        { skipped, total: toAdd.length },
        "Skipped reactions for non-existent messages or users"
      );
    }
  }

  // Batch delete
  if (toRemove.length > 0) {
    await db.messageReaction.deleteMany({
      where: {
        OR: toRemove.map((r) => ({
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
        })),
      },
    });
  }

  logger.info(
    { added: toAdd.length, removed: toRemove.length },
    "Reactions batch persisted"
  );
};
