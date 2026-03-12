import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteThreadInput, DeleteThreadOutput } from "./types";

export const handler = async (
  input: DeleteThreadInput,
  ctx: ServiceContext
): Promise<DeleteThreadOutput> => {
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
    ctx.permissions.assert("conversation:delete", scope),
  ]);

  // Verify thread exists and user is member
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      workspaceId,
      type: "THREAD",
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found or access denied");
  }

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: threadId },
  });

  // Fanout to all members
  await Promise.all(
    thread.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-deleted",
          payload: {
            threadId,
            deletedBy: userId,
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
