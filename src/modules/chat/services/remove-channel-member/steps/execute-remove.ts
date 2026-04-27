import type { ServiceContext } from "@/graphql/types";
import type { RemoveChannelMemberInput, RemoveChannelMemberOutput } from "../types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

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

  // Remove member + emit notification in one atomic transaction
  await ctx.db.$transaction(async (tx) => {
    await tx.chatMember.delete({
      where: {
        conversationId_userId: {
          conversationId: channelId,
          userId: targetUserId,
        },
      },
    });

    // Notification pipeline — routes through Decider → IN_APP + REALTIME workers
    await emit(tx, {
      type: "chat.channel.member.removed",
      payload: {
        conversationId:   channelId,
        conversationName: channel.name,
        workspaceId:      input.workspaceId,
        workspaceSlug:    "",  // not available at this layer; unused by handler
        removedUserId:    targetUserId,
        actorId:          actorId,
        actorName:        "Someone", // resolved in handler via actorId if needed
      },
    });
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO ELIMINATE CACHE LOOP
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, targetUserId);
  }

  // Fanout to removed user tracking natively via redis dropping mapped channels bounds
  // Uses dot notation to match NotificationDownstreamEvent.ChatChannelMemberRemoved
  await ctx.redis.publish(
    `user:${targetUserId}:events`,
    JSON.stringify({
      type: "chat.channel.member.removed",
      data: {
        conversationId:   channelId,
        conversationName: channel.name,
        workspaceId:      input.workspaceId,
        workspaceSlug:    "",
        removedUserId:    targetUserId,
        actorId:          actorId,
        actorName:       "Someone",
      },
    })
  );

  return {
    success: true,
    channelId,
    userId: targetUserId,
  };
}
