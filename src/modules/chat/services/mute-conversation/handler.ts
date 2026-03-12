import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { MuteConversationInput, MuteConversationOutput } from "./types";

/**
 * Mute Conversation Handler
 *
 * Universal service - works for all conversation types.
 * Updates the ChatMember.isMuted field for the current user.
 */
export const handler = async (
  input: MuteConversationInput,
  ctx: ServiceContext
): Promise<MuteConversationOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate) throw AppError.unauthorized();

  const { conversationId, isMuted } = input;

  // Step 0 — channel member gate
  const cachedChannel = await ctx.authGate.getChannel(conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");
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
    throw AppError.notFound("You are not a member of this conversation");
  }

  // Update mute status
  await ctx.db.chatMember.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: {
      isMuted,
    },
  });

  return {
    success: true,
    conversationId,
    isMuted,
  };
};
