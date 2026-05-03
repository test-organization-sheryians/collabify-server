import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { LockingService } from "@/services/locking/locking.service";
import { createLockKeys } from "@/services/locking/keys";
import type { CreateThreadInput, CreateThreadOutput } from "../types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

/**
 * Securely extracts thread generation.
 * Handles Distributed Lock protection bounding on `messageId`, Idempotent thread returns handling concurrent creation crashes,
 * and TOCTOU freshMessage transaction copying mapping directly to `replyCount: { increment: 1 }`.
 */
export const create = async (
  input: CreateThreadInput,
  ctx: ServiceContext
): Promise<CreateThreadOutput> => {
  const { workspaceId, projectId, conversationId, messageId } = input;
  const userId = ctx.auth?.userId as string;

  // 5. Acquire distributed lock to prevent race conditions
  const lockKeys = createLockKeys("thread", { type: "project", id: projectId });
  const lockKey = lockKeys.resource(messageId);

  const lockAcquired = await LockingService.acquire(lockKey, userId, 10);

  if (!lockAcquired) {
    throw AppError.conflict(
      "Thread creation already in progress for this message. Please retry in a moment."
    );
  }

  try {
    // 6. Idempotent check: thread already exists for this message?
    const existingThread = await ctx.db.chatConversation.findUnique({
      where: { parentMessageId: messageId },
    });

    if (existingThread) {
      // Thread already exists - return it (idempotent)
      return existingThread;
    }

    // 7. Create thread conversation with auto-copied members (transaction)
    const thread = await ctx.db.$transaction(async (tx) => {
      // Re-validate parent message still exists (TOCTOU protection)
      const freshMessage = await tx.chatMessage.findUnique({
        where: { id: messageId },
        select: { id: true, conversationId: true },
      });

      if (!freshMessage) {
        throw AppError.notFound("Parent message was deleted");
      }

      // Get all members from parent conversation to auto-copy
      const parentMembers = await tx.chatMember.findMany({
        where: { conversationId },
        select: {
          userId: true,
        },
      });

      if (parentMembers.length === 0) {
        throw AppError.badRequest("Parent conversation has no members");
      }

      // Create thread conversation
      const threadConversation = await tx.chatConversation.create({
        data: {
          workspaceId,
          projectId,
          type: "THREAD",
          parentConversationId: conversationId,
          parentMessageId: messageId,
          name: null, // Threads don't have names
          topic: null,

          // Auto-copy members from parent conversation
          members: {
            createMany: {
              data: parentMembers.map((m) => ({
                userId: m.userId,
              })),
            },
          },
        },
      });

      // Increment parent message reply count
      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          replyCount: { increment: 1 },
        },
      });

      // Emit notification for thread creation
      await emit(tx, {
        type: "chat.thread.created",
        payload: {
          threadId: threadConversation.id,
          conversationId: threadConversation.parentConversationId ?? threadConversation.id,
          conversationName: null,
          workspaceId,
          workspaceSlug: "",
          actorId: userId,
          actorName: "Someone",
          contentPreview: "",
          recipientIds: parentMembers.map((m) => m.userId),
        } as any,
        deduplicationId: `chat.thread.created:${threadConversation.id}:${Date.now()}`,
      });

      return threadConversation;
    });

    return thread;
  } finally {
    // 8. Always release lock (even if error occurs)
    await LockingService.release(lockKey, userId);
  }
};
