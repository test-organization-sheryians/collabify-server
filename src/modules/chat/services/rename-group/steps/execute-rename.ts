import type { ServiceContext } from "@/graphql/types";
import type { RenameGroupInput, RenameGroupOutput } from "../types";

/**
 * executeRename mutates the native DB schema, handles memory validation clears globally safely updating all members reliably mapping WS event broadcasts natively.
 */
export async function executeRename(
  input: RenameGroupInput,
  group: { id: string; members: { userId: string }[] },
  ctx: ServiceContext
): Promise<RenameGroupOutput> {
  const { groupId, name } = input;
  const actorId = ctx.auth?.userId as string;

  // Update name
  const updated = await ctx.db.chatConversation.update({
    where: { id: groupId },
    data: { name },
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO DROP GLOBAL CHANNEL_STATE
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(groupId, actorId);
  }

  // Fanout to all members tracking the WS limits
  await Promise.all(
    group.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-renamed",
          payload: {
            groupId,
            name,
            renamedBy: actorId, // Passed safely downstream
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    groupId: updated.id,
    name: updated.name || name,
  };
}
