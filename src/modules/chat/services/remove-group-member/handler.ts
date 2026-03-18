import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RemoveGroupMemberInput, RemoveGroupMemberOutput } from "./types";

export const handler = async (
  input: RemoveGroupMemberInput,
  ctx: ServiceContext
): Promise<RemoveGroupMemberOutput> => {
  const { userId: actorId } = ctx.auth;
  if (!actorId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, groupId, userId: targetUserId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) throw AppError.notFound("Group not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(groupId),
    ctx.permissions.assert("conversation.member:remove", scope),
  ]);

  // Verify group exists
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      deletedAt: null,
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found");
  }

  // Verify target membership exists
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: groupId,
        userId: targetUserId,
      },
    },
  });

  if (!membership) {
    throw AppError.notFound("User is not a member of this group");
  }

  // Remove member
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: groupId,
        userId: targetUserId,
      },
    },
  });

  // Fanout to removed user
  await ctx.redis.publish(
    `user:${targetUserId}:events`,
    JSON.stringify({
      type: "chat:group-member-removed",
      payload: {
        groupId,
        groupName: group.name,
        removedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    })
  );

  return {
    success: true,
    groupId,
    userId: targetUserId,
  };
};
