import type { ServiceContext } from "@/graphql/types";
import type { ReopenThreadInput, ReopenThreadOutput } from "../types";

/**
 * executeReopen logically updates `closedAt: null` natively returning mapped WS invalidations securely.
 * Patches vulnerability clearing `authGate` state automatically.
 */
export async function executeReopen(
  input: ReopenThreadInput,
  thread: { id: string; members: { userId: string }[] },
  ctx: ServiceContext
): Promise<ReopenThreadOutput> {
  const { threadId } = input;
  const actorId = ctx.auth?.userId as string;

  // Reopen thread natively
  await ctx.db.chatConversation.update({
    where: { id: threadId },
    data: { closedAt: null },
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO DROP GLOBAL CHANNEL_STATE
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(threadId, actorId);
  }

  // Fanout to all members
  await Promise.all(
    thread.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-reopened",
          payload: {
            threadId,
            reopenedBy: actorId, // Pulled correctly mapped explicitly
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    threadId,
  };
}
