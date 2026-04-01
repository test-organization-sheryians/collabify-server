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
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: parentMessageId },
    select: { conversationId: true },
  });
  if (!parentMessage) {
    throw AppError.notFound("Message not found", "MESSAGE_NOT_FOUND");
  }

  const cachedChannel = await ctx.authGate.getChannel(parentMessage.conversationId);
  if (!cachedChannel) {
    throw AppError.notFound("Conversation not found", "CHANNEL_NOT_FOUND");
  }

  if (!cachedChannel.projectId) {
    throw AppError.badRequest(
      "Channel must belong to a project to evaluate permissions.",
      "INVALID_CHANNEL_TYPE"
    );
  }

  const scope = {
    type: "project" as const,
    id: cachedChannel.projectId,
    workspaceId: cachedChannel.workspaceId,
  };
  await Promise.all([
    ctx.authGate.assertChannelMember(parentMessage.conversationId),
    ctx.permissions.assert("chat:channel:read", scope),
  ]);

  return { conversationId: parentMessage.conversationId };
}
