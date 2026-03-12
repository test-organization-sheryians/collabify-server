import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnsubscribeThreadInput, UnsubscribeThreadOutput } from "./types";

export const handler = async (
  input: UnsubscribeThreadInput,
  ctx: ServiceContext
): Promise<UnsubscribeThreadOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate) throw AppError.unauthorized();

  const { threadId } = input;

  // Step 0 — channel member gate
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) throw AppError.notFound("Thread not found");
  await ctx.authGate.assertChannelMember(threadId);

  // Check if subscribed
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId,
      },
    },
  });

  if (!membership) {
    // Not subscribed, return success anyway
    return {
      success: true,
      threadId,
      isSubscribed: false,
    };
  }

  // Remove subscription
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId,
      },
    },
  });

  return {
    success: true,
    threadId,
    isSubscribed: false,
  };
};
