import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { SubscribeThreadInput } from "../types";

export interface AssertAccessOutput {
  isAlreadySubscribed: boolean;
}

/**
 * assertAccess internally orchestrating channel thread limits tracking:
 * 1. Valid channel properties safely bounding target checks limits natively.
 * 2. Short circuit checking determining idempotency accurately resolving "Already Subscribed" patterns correctly mapped.
 */
export async function assertAccess(
  input: SubscribeThreadInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { threadId } = input;

  // Step 0 — channel member gate (verifies access to thread/parent safely tracing mapped cache bounds)
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) {
    throw AppError.notFound("Thread not found", "NOT_FOUND");
  }
  
  await ctx.authGate.assertChannelMember(threadId);

  // Verify thread exists
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      type: "THREAD",
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found", "NOT_FOUND");
  }

  // Check if already member
  const existing = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: threadId,
        userId,
      },
    },
    select: { id: true },
  });

  return { isAlreadySubscribed: !!existing };
}
