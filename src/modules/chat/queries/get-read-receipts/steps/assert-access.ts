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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true, sequence: true },
  });
  if (!message) throw AppError.notFound("Message not found");

  const cachedChannel = await ctx.authGate.getChannel(message.conversationId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(message.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  return { conversationId: message.conversationId, sequence: message.sequence };
}
