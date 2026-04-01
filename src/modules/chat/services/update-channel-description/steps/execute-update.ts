import type { ServiceContext } from "@/graphql/types";
import type { UpdateChannelDescriptionInput, UpdateChannelDescriptionOutput } from "../types";

/**
 * executeUpdate successfully modifies Prisma mapped domains safely flushing WS caches dynamically dropping traces natively.
 */
export async function executeUpdate(
  input: UpdateChannelDescriptionInput,
  ctx: ServiceContext
): Promise<UpdateChannelDescriptionOutput> {
  const { channelId, description } = input;
  const actorId = ctx.auth?.userId as string;

  // Update description mapped cleanly into topic Prisma bounds
  const updated = await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      topic: description || null,
    },
  });

  // FLUSH EXPLICITLY THE CACHED TARGET RESOLVING WS LEAKS ACROSS RECONNECTIONS PROMPTLY
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, actorId);
  }

  // Fanout update event resolving target memberships manually matching legacy bounds explicitly
  const members = await ctx.db.chatMember.findMany({
    where: { conversationId: channelId },
    select: { userId: true },
  });
  
  await Promise.all(
    members.map(async (member: { userId: string }) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-description-updated",
          payload: {
            channelId,
            description: description || null,
            updatedBy: actorId, // Pulled locally resolving mappings natively
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId: updated.id,
    description: updated.topic,
  };
}
