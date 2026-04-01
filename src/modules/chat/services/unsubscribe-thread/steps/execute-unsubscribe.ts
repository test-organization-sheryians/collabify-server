import type { ServiceContext } from "@/graphql/types";
import type { UnsubscribeThreadInput, UnsubscribeThreadOutput } from "../types";

/**
 * executeUnsubscribe successfully deletes the native `chatMember` DB object effectively forcing WebSocket channels out of scope for subsequent queries natively.
 */
export async function executeUnsubscribe(
  input: UnsubscribeThreadInput,
  ctx: ServiceContext
): Promise<UnsubscribeThreadOutput> {
  const { threadId } = input;
  const actorId = ctx.auth?.userId as string;

  // Remove subscription securely via native mapping scopes directly
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId: actorId,
      },
    },
  });

  // FLUSH EXPLICITLY THE CACHED TARGET RESOLVING WS LEAKS ACROSS RECONNECTIONS PROMPTLY
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(threadId, actorId);
  }

  return {
    success: true,
    threadId,
    isSubscribed: false,
  };
}
