import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { SubscribeThreadInput, SubscribeThreadOutput } from "./types";

/**
 * Subscribe Thread Handler
 *
 * Explicitly subscribe to a thread (even if not participant).
 * Creates ChatMember entry if doesn't exist.
 */
export const handler = async (
  input: SubscribeThreadInput,
  ctx: ServiceContext
): Promise<SubscribeThreadOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate) throw AppError.unauthorized();

  const { threadId } = input;

  // Step 0 — channel member gate (verifies access to thread/parent)
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) throw AppError.notFound("Thread not found");
  await ctx.authGate.assertChannelMember(threadId);

  // Verify thread exists
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      type: "THREAD",
      deletedAt: null,
    },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found");
  }

  // Check if already member
  const existing = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId,
      },
    },
  });

  if (existing) {
    // Already subscribed
    return {
      success: true,
      threadId,
      isSubscribed: true,
    };
  }

  // Create subscription (member entry)
  await ctx.db.chatMember.create({
    data: {
      conversationId: threadId,
      userId,
      role: "MEMBER",
    },
  });

  return {
    success: true,
    threadId,
    isSubscribed: true,
  };
};
