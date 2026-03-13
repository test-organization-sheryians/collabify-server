import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * fetchMessageConversation — fetches only the conversationId for auth resolution.
 * Minimal select — used as the pre-auth step to resolve conversationId from messageId.
 *
 * @throws AppError 404  if message does not exist
 */
export async function fetchMessageConversation(
  messageId: string,
  ctx: ServiceContext
): Promise<{ conversationId: string }> {
  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw AppError.notFound("Message not found");
  return { conversationId: message.conversationId };
}
