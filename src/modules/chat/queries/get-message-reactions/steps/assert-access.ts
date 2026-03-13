import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — pure auth gate for get-message-reactions.
 * Takes conversationId resolved by the caller (from fetch-message-id step).
 * No DB queries — only Redis-backed auth cache lookups.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if conversation not found in auth cache
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export async function assertAccess(
  conversationId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const cachedChannel = await ctx.authGate.getChannel(conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);
}
