import type { ServiceContext } from "@/graphql/types";
import type { RemoveChannelMemberInput, RemoveChannelMemberOutput } from "../types";

/**
 * executeRemove logically drops the Prisma bounds and natively targets the target `userId` cache limit safely forcing Global WebSocket clears automatically.
 */
export async function executeRemove(
  input: RemoveChannelMemberInput,
  channel: { id: string; name: string },
  ctx: ServiceContext
): Promise<RemoveChannelMemberOutput> {
  const { channelId, userId: targetUserId } = input;
  const actorId = ctx.auth?.userId as string;

  // Remove member natively from Database
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: channelId,
        userId: targetUserId,
      },
    },
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO ELIMINATE CACHE LOOP
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, targetUserId);
  }

  // Fanout to removed user tracking natively via redis dropping mapped channels bounds
  await ctx.redis.publish(
    `user:${targetUserId}:events`,
    JSON.stringify({
      type: "chat:channel-member-removed",
      payload: {
        channelId,
        channelName: channel.name,
        removedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    })
  );

  return {
    success: true,
    channelId,
    userId: targetUserId,
  };
}
