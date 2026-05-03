import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { MuteConversationInput } from "../types";

export interface AssertAccessOutput {
  membership: {
    conversationId: string;
    userId: string;
  };
}

/**
 * assertAccess logic for mute-conversation.
 * Checks channel explicitly against context bounding user membership locally.
 * Throws specific `"NOT_FOUND"` properties safely tracking execution blocks upstream natively.
 */
export async function assertAccess(
  input: MuteConversationInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!ctx.authGate || !userId) {
    throw AppError.unauthorized();
  }

  const { conversationId } = input;

  // Step 0 — channel member gate
  const cachedChannel = await ctx.authGate.getChannel(conversationId);
  if (!cachedChannel) {
    throw AppError.notFound("Conversation not found", "NOT_FOUND");
  }
  
  await ctx.authGate.assertChannelMember(conversationId);

  // Verify membership exists
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw AppError.notFound("You are not a member of this conversation", "NOT_FOUND");
  }

  return { membership };
}
