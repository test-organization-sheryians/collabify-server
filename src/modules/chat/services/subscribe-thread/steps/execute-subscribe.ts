import type { ServiceContext } from "@/graphql/types";
import type { SubscribeThreadInput, SubscribeThreadOutput } from "../types";

/**
 * executeSubscribe completes mapping Prisma subscriptions correctly clearing any invalid WS cache mapping states internally securely mapping target identities explicitly.
 */
export async function executeSubscribe(
  input: SubscribeThreadInput,
  ctx: ServiceContext
): Promise<SubscribeThreadOutput> {
  const { threadId } = input;
  const actorId = ctx.auth?.userId as string;

  // Create subscription (member entry) mapping natively
  await ctx.db.chatMember.create({
    data: {
      conversationId: threadId,
      userId: actorId,
    },
  });

  // FIRE INVALIDATION MAP EXPLICITLY TO DROP GLOBAL CHANNEL_STATE FOR TARGET TARGET
  if (ctx.authGate) {
    await ctx.authGate.invalidate.channelMember(threadId, actorId);
  }

  return {
    success: true,
    threadId,
    isSubscribed: true,
  };
}
