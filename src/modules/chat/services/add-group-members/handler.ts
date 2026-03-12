import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { AddGroupMembersInput, AddGroupMembersOutput } from "./types";

export const handler = async (
  input: AddGroupMembersInput,
  ctx: ServiceContext
): Promise<AddGroupMembersOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, groupId, userIds } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) throw AppError.notFound("Group not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(groupId),
    ctx.permissions.assert("conversation.member:add", scope),
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

  // Get existing members
  const existingMembers = await ctx.db.chatMember.findMany({
    where: {
      conversationId: groupId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const existingIds = new Set(existingMembers.map((m) => m.userId));
  const newUserIds = userIds.filter((id) => !existingIds.has(id));

  if (newUserIds.length === 0) {
    throw AppError.badRequest("All users are already members");
  }

  // Bulk add in transaction
  const newMembers = await ctx.db.$transaction(
    newUserIds.map((uid) =>
      ctx.db.chatMember.create({
        data: {
          conversationId: groupId,
          userId: uid,
          role: "MEMBER",
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      })
    )
  );

  // Fanout to new members
  await Promise.all(
    newMembers.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-member-added",
          payload: {
            groupId,
            groupName: group.name,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    addedCount: newMembers.length,
    skippedCount: existingIds.size,
    members: newMembers.map((m) => ({
      userId: m.userId,
      user: {
        id: m.user.id,
        fullName: m.user.fullName || "Unknown",
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
    })),
  };
};
