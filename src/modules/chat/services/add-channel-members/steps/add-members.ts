import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { AddChannelMembersInput, AddChannelMembersOutput } from "../types";

export const addMembers = async (
  input: AddChannelMembersInput,
  channelName: string,
  ctx: ServiceContext
): Promise<AddChannelMembersOutput> => {
  const { channelId, userIds } = input;

  // Identify any users who are already enrolled
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

  // Bind structural insert records into identical timeline batch
  const newMembers = await ctx.db.$transaction(
    newUserIds.map((uid) =>
      ctx.db.chatMember.create({
        data: {
          conversationId: channelId,
          userId: uid,
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

  // Distribute event payloads to exactly the newly provisioned peers
  await Promise.all(
    newMembers.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-member-added",
          payload: {
            channelId,
            channelName,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  // Build uniform API array structure response
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
