import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { ReopenThreadInput, ReopenThreadOutput } from "./types";

export const handler = async (
  input: ReopenThreadInput,
  ctx: ServiceContext
): Promise<ReopenThreadOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, threadId } = input;

  // Verify thread exists and user is member
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      workspaceId,
      type: "THREAD",
      members: { some: { userId } },
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found or access denied");
  }

  // Check if already open
  if (!thread.closedAt) {
    throw AppError.badRequest("Thread is already open");
  }

  // Reopen thread
  await ctx.db.chatConversation.update({
    where: { id: threadId },
    data: { closedAt: null },
  });

  // Fanout to all members
  await Promise.all(
    thread.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-reopened",
          payload: {
            threadId,
            reopenedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    threadId,
  };
};
