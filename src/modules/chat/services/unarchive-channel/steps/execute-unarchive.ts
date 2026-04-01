import type { ServiceContext } from "@/graphql/types";
import type { UnarchiveChannelInput, UnarchiveChannelOutput } from "../types";

/**
 * executeUnarchive completes dropping DB archive flags dynamically passing mapped invalidations to Redis directly safely tracking target mutations.
 */
export async function executeUnarchive(
  input: UnarchiveChannelInput,
  channel: { name: string | null; members: { userId: string }[] },
  ctx: ServiceContext
): Promise<UnarchiveChannelOutput> {
  const { workspaceId, channelId } = input;
  const actorId = ctx.auth?.userId as string;

  // Unarchive channel natively
  const updated = await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      deletedAt: null,
      isArchived: false,
    },
  });

  // EXPLICIT INVALIDATION WRAPPER DROPPING CHANNEL DOMAINS GLOBALLY TO RECONNECT WS CLIENS PROMPTLY
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(channelId, actorId);
  }

  // Fanout explicitly passing target properties
  await Promise.all(
    channel.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-unarchived",
          payload: {
            channelId,
            workspaceId,
            name: channel.name,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId: updated.id,
    name: updated.name || "Unnamed Channel",
  };
}
