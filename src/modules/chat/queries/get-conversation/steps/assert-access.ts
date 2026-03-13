import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — Redis-backed auth gate for getConversation.
 *
 * All three checks hit Redis first with a DB fallback on cold cache.
 * assertChannelMember and permissions.assert are parallelised because
 * they are independent — failing fast on either is acceptable.
 *
 * Runs before any DB fetch so non-members never trigger data queries.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if conversation does not exist
 * @throws AppError 403  if caller is not a member or lacks conversation:read
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
