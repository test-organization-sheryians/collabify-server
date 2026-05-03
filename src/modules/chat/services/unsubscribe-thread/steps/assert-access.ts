import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnsubscribeThreadInput } from "../types";

export interface AssertAccessOutput {
  isNotSubscribed: boolean;
}

/**
 * assertAccess logic internally checking:
 * 1. Safely checks channel existence throwing map blocks cleanly tracking missing domains natively ("NOT_FOUND").
 * 2. Pre-validates `chatMember` subscriptions yielding out early bypassing double DB transactions.
 */
export async function assertAccess(
  input: UnsubscribeThreadInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId: actorId } = ctx.auth;
  if (!actorId || !ctx.authGate) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { threadId } = input;

  // Step 0 — channel member gate checking target maps globally limiting DB drops dynamically safely.
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) {
    throw AppError.notFound("Thread not found", "NOT_FOUND");
  }
  
  await ctx.authGate.assertChannelMember(threadId);

  // Check if currently subscribed
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId: actorId,
      },
    },
    select: { id: true },
  });

  return { isNotSubscribed: !membership };
}
