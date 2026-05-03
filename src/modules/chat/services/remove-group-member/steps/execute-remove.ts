import type { ServiceContext } from "@/graphql/types";
import type { RemoveGroupMemberInput, RemoveGroupMemberOutput } from "../types";

/**
 * executeRemove logically drops Prisma limits natively resolving standard WS invalidation.
 * Patches global memory vulnerabilities securely by clearing AuthGate cache.
 */
export async function executeRemove(
  input: RemoveGroupMemberInput,
  group: { id: string; name: string },
  ctx: ServiceContext
): Promise<RemoveGroupMemberOutput> {
  const { groupId, userId: targetUserId } = input;
  const actorId = ctx.auth?.userId as string;

  // Remove member natively from Database
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: groupId,
        userId: targetUserId,
      },
    },
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO ELIMINATE CACHE LOOP
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(groupId, targetUserId);
  }

  // Fanout WS event to the dropped target
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
}
