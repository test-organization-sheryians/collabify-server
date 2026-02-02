import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { AddChannelMembersInput, AddChannelMembersOutput } from "./types";

export const handler = async (
  input: AddChannelMembersInput,
  ctx: ServiceContext
): Promise<AddChannelMembersOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId, userIds } = input;

  // Verify channel exists
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
      deletedAt: null,
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found");
  }

  // Get existing members
  const existingMembers = await ctx.db.chatMember.findMany({
    where: {
      conversationId: channelId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const existingIds = new Set(existingMembers.map((m) => m.userId));
  const newUserIds = userIds.filter((id) => !existingIds.has(id));

  if (newUserIds.length === 0) {
    throw AppError.badRequest("All users are already members");
  }

  // Bulk add members in transaction
  const newMembers = await ctx.db.$transaction(
    newUserIds.map((uid) =>
      ctx.db.chatMember.create({
        data: {
          conversationId: channelId,
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
          type: "chat:channel-member-added",
          payload: {
            channelId,
            channelName: channel.name,
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
