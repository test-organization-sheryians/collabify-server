import type { ServiceContext } from "@/graphql/types";
import type { UpdateChannelVisibilityInput, UpdateChannelVisibilityOutput } from "../types";

/**
 * executeVisibility persists the isPublic flag to the DB and fans out a
 * visibility-changed event to all channel members via Redis pub/sub.
 */
export async function executeVisibility(
  input: UpdateChannelVisibilityInput,
  channel: { members: { userId: string }[] },
  ctx: ServiceContext
): Promise<UpdateChannelVisibilityOutput> {
  const { channelId, isPublic } = input;
  const actorId = ctx.auth?.userId as string;

  // Persist visibility change to DB
  await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: { isPublic },
  });

  // Invalidate permission cache for the actor
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, actorId);
  }

  // Fan out visibility update to all channel members via Redis
  await Promise.all(
    channel.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-visibility-updated",
          payload: {
            channelId,
            isPublic,
            updatedBy: actorId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId,
    isPublic,
  };
}
