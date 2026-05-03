import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { AddGroupMembersInput, AddGroupMembersOutput } from "../types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const addMembers = async (
  input: AddGroupMembersInput,
  groupName: string,
  ctx: ServiceContext
): Promise<AddGroupMembersOutput> => {
  const { groupId, userIds } = input;

  // Identify any users who are already enrolled
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

  // Bind structural insert records into identical timeline batch
  const newMembers = await ctx.db.$transaction(async (tx) => {
    const members = [];
    for (const uid of newUserIds) {
      const member = await tx.chatMember.create({
        data: {
          conversationId: groupId,
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
      members.push(member);

      await emit(tx, {
        type: "chat.group.member.added",
        payload: {
          conversationId: groupId,
          conversationName: groupName,
          workspaceId: input.workspaceId,
          workspaceSlug: "",
          newMemberId: uid,
          actorId: ctx.auth?.userId ?? "",
          actorName: "Someone",
        } as any,
        deduplicationId: `chat.group.member.added:${groupId}:${uid}:${Date.now()}`,
      });
    }
    return members;
  });

  // Distribute event payloads to exactly the newly provisioned peers
  await Promise.all(
    newMembers.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-member-added",
          payload: {
            groupId,
            groupName,
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
