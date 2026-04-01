import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — pure auth gate. Takes conversationId (resolved by the caller
 * from the fetched message), verifies channel membership and read permission.
 *
 * No DB queries — only Redis-backed auth cache lookups.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if conversation does not exist in auth cache
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export async function assertAccess(
  conversationId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const cachedChannel = await ctx.authGate.getChannel(conversationId);
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
    ctx.authGate.assertChannelMember(conversationId),
    ctx.permissions.assert("chat:channel:read", scope),
  ]);
}
