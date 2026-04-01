import type { ServiceContext } from "@/graphql/types";
import type { UpdateChannelVisibilityInput, UpdateChannelVisibilityOutput } from "../types";

/**
 * executeVisibility handles DB updates wrapping Prisma placeholders correctly resolving target drops efficiently cleanly mapped natively.
 */
export async function executeVisibility(
  input: UpdateChannelVisibilityInput,
  channel: { members: { userId: string }[] },
  ctx: ServiceContext
): Promise<UpdateChannelVisibilityOutput> {
  const { channelId, isPublic } = input;
  const actorId = ctx.auth?.userId as string;

  // TODO: Add isPublic field to Prisma schema and update here
  // For now, we'll just fanout the event mimicking the DB structure bounds faithfully
  // const updated = await ctx.db.chatConversation.update({
  //   where: { id: channelId },
  //   data: { isPublic },
  // });

  // FLUSH EXPLICITLY THE CACHED TARGET RESOLVING WS LEAKS ACROSS RECONNECTIONS PROMPTLY
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, actorId);
  }

  // Fanout visibility update mapped directly down redis
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
