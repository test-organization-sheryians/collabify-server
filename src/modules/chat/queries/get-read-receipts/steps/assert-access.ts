import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess for get-read-receipts.
 * Fetches message to get conversationId + sequence (needed for DB fallback).
 * Returns both to avoid a second DB query.
 */
export async function assertAccess(
  messageId: string,
  ctx: ServiceContext
): Promise<{ conversationId: string; sequence: number }> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true, sequence: true },
  });
  if (!message) {
    throw AppError.notFound("Message not found", "MESSAGE_NOT_FOUND");
  }

  const cachedChannel = await ctx.authGate.getChannel(message.conversationId);
  if (!cachedChannel) {
    throw AppError.notFound("Channel not found", "CHANNEL_NOT_FOUND");
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
    ctx.authGate.assertChannelMember(message.conversationId),
    ctx.permissions.assert("chat:channel:read", scope),
  ]);

  return { conversationId: message.conversationId, sequence: message.sequence };
}
