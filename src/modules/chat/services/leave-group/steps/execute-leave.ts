import type { ServiceContext } from "@/graphql/types";
import type { LeaveGroupInput, LeaveGroupOutput } from "../types";

/**
 * executeLeave logic explicitly executing Prisma `chatMember.delete` cleanly mapping.
 * Routes target mapped bounds resolving destruct limit or WS fanout securely.
 */
export async function executeLeave(
  input: LeaveGroupInput,
  group: { id: string; members: { userId: string }[] },
  ctx: ServiceContext
): Promise<LeaveGroupOutput> {
  const { groupId } = input;
  const userId = ctx.auth?.userId as string;

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
}
