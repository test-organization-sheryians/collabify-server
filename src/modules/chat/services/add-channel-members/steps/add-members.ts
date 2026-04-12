import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { AddChannelMembersInput, AddChannelMembersOutput } from "../types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

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

  // Bind structural insert records and emit outbox notification in one transaction per member
  const newMembers = await Promise.all(
    newUserIds.map((uid) =>
      ctx.db.$transaction(async (tx) => {
        const member = await tx.chatMember.create({
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
        });

        // Notification pipeline — routes through Decider → IN_APP + REALTIME workers
        await emit(tx, {
          type: "chat.channel.member.added",
          payload: {
            conversationId:   channelId,
            conversationName: channelName,
            workspaceId:      input.workspaceId,
            workspaceSlug:    "", // not available at this layer; unused by handler
            newMemberId:      uid,
            actorId:          ctx.auth?.userId ?? "",
            actorName:        "Someone", // resolved in handler via actorId if needed
          },
        });

        return member;
      })
    )
  );

  // WS gateway event — separate concern: updates real-time channel membership UI
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
