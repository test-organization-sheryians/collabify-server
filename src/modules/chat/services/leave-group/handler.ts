import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { LeaveGroupInput, LeaveGroupOutput } from "./types";

/**
 * Leave Group Handler
 *
 * User removes themselves from a group.
 * If last member leaves, group is automatically deleted.
 */
export const handler = async (
  input: LeaveGroupInput,
  ctx: ServiceContext
): Promise<LeaveGroupOutput> => {
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
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or you are not a member");
  }

  // Remove user's membership
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: groupId,
        userId,
      },
    },
  });

  // If last member, delete group
  if (group.members.length === 1) {
    await ctx.db.chatConversation.delete({
      where: { id: groupId },
    });
  } else {
    // Fanout to remaining members
    const remainingMembers = group.members.filter((m) => m.userId !== userId);
    await Promise.all(
      remainingMembers.map(async (member) => {
        await ctx.redis.publish(
          `user:${member.userId}:events`,
          JSON.stringify({
            type: "chat:group-member-left",
            payload: {
              groupId,
              userId,
              timestamp: new Date().toISOString(),
            },
          })
        );
      })
    );
  }

  return {
    success: true,
    groupId,
  };
};
