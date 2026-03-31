import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { CloseThreadInput, CloseThreadOutput } from "./types";

/**
 * Close Thread Handler
 *
 * Marks a thread as closed. No new messages allowed (enforced at send-message level).
 */
export const handler = async (
  input: CloseThreadInput,
  ctx: ServiceContext
): Promise<CloseThreadOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, threadId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) throw AppError.notFound("Thread not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(threadId),
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

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

  // Check if already closed
  if (thread.closedAt) {
    throw AppError.badRequest("Thread is already closed");
  }

  // Close thread
  const closedAt = new Date();
  await ctx.db.chatConversation.update({
    where: { id: threadId },
    data: { closedAt },
  });

  // Fanout to all members
  await Promise.all(
    thread.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-closed",
          payload: {
            threadId,
            closedBy: userId,
            closedAt: closedAt.toISOString(),
            timestamp: closedAt.toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    threadId,
    closedAt,
  };
};
