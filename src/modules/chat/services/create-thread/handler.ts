import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { LockingService } from "@/services/locking/locking.service";
import { createLockKeys } from "@/services/locking/keys";
import { CreateThreadInput, CreateThreadOutput } from "./types";

/**
 * Create Thread Service (Robust Version)
 *
 * Creates a thread as a separate ChatConversation entity (type=THREAD)
 * with distributed locking to prevent race conditions.
 *
 * Features:
 * - Distributed locking (1:1 thread per message)
 * - Project-scoped validation
 * - Auto-copy members from parent conversation
 * - Idempotent (returns existing thread if found)
 * - Transaction-based creation
 */
export const handler = async (
  input: CreateThreadInput,
  ctx: ServiceContext
): Promise<CreateThreadOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);
  }

  const { workspaceId, projectId, conversationId, messageId } = input;

  // 1. Validate project membership
  const projectMembership = await ctx.db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!projectMembership) {
    throw AppError.forbidden("You are not a member of this project");
  }

  // 2. Validate parent conversation membership
  const conversationMembership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!conversationMembership) {
    throw AppError.forbidden("You are not a member of this conversation");
  }

  // 3. Validate parent message exists and belongs to conversation
  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      parentMessageId: true,
    },
  });

  if (!parentMessage) {
    throw AppError.notFound("Message not found");
  }

  if (parentMessage.conversationId !== conversationId) {
    throw AppError.badRequest(
      "Message does not belong to the specified conversation"
    );
  }

  // Prevent threading on reply messages (only thread on top-level messages)
  if (parentMessage.parentMessageId) {
    throw AppError.badRequest(
      "Cannot create thread on a reply message. Threads can only be created on top-level messages."
    );
  }

  // 4. Validate parent conversation exists and matches workspace/project
  const parentConversation = await ctx.db.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      workspaceId: true,
      projectId: true,
      isArchived: true,
      deletedAt: true,
    },
  });

  if (!parentConversation) {
    throw AppError.notFound("Conversation not found");
  }

  if (parentConversation.workspaceId !== workspaceId) {
    throw AppError.badRequest("Conversation does not belong to this workspace");
  }

  if (parentConversation.projectId !== projectId) {
    throw AppError.badRequest("Conversation does not belong to this project");
  }

  if (parentConversation.isArchived) {
    throw AppError.badRequest("Cannot create thread in archived conversation");
  }

  if (parentConversation.deletedAt) {
    throw AppError.badRequest("Cannot create thread in deleted conversation");
  }

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
          role: true,
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
                role: m.role, // Preserve roles from parent
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

      return threadConversation;
    });

    return thread;
  } finally {
    // 8. Always release lock (even if error occurs)
    await LockingService.release(lockKey, userId);
  }
};
