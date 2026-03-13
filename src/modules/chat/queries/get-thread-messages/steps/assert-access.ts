import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — fetches the parent message to get its conversationId, then
 * verifies channel membership and read permission.
 *
 * Returns conversationId so the handler doesn't need another DB query.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if parent message does not exist
 * @throws AppError 404  if conversation does not exist
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export async function assertAccess(
  parentMessageId: string,
  ctx: ServiceContext
): Promise<{ conversationId: string }> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: parentMessageId },
    select: { conversationId: true },
  });
  if (!parentMessage) throw AppError.notFound("Message not found");

  const cachedChannel = await ctx.authGate.getChannel(parentMessage.conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(parentMessage.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  return { conversationId: parentMessage.conversationId };
}
