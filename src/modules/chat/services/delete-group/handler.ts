import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteGroupInput, DeleteGroupOutput } from "./types";

export const handler = async (
  input: DeleteGroupInput,
  ctx: ServiceContext
): Promise<DeleteGroupOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, groupId } = input;

  // Verify group exists and user is member
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or access denied");
  }

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: groupId },
  });

  // Fanout to all members
  await Promise.all(
    group.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-deleted",
          payload: {
            groupId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    groupId,
  };
};
