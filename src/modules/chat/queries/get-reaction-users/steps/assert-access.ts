import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess for get-reaction-users.
 * Fetches message to get conversationId, then verifies channel membership.
 * Returns conversationId so fetch step doesn't need another DB query.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if message or channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export async function assertAccess(
  messageId: string,
  ctx: ServiceContext
): Promise<{ conversationId: string }> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw AppError.notFound("Message not found");

  const cachedChannel = await ctx.authGate.getChannel(message.conversationId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(message.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  return { conversationId: message.conversationId };
}
