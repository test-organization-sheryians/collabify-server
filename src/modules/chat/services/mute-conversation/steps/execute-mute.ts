import type { ServiceContext } from "@/graphql/types";
import type { MuteConversationInput, MuteConversationOutput } from "../types";

/**
 * executeMute operation exclusively parsing `isMuted` maps to members arrays directly natively.
 */
export async function executeMute(
  input: MuteConversationInput,
  ctx: ServiceContext
): Promise<MuteConversationOutput> {
  const { conversationId, isMuted } = input;
  const userId = ctx.auth?.userId as string;

  // Update mute status natively mapping object rules
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
}
