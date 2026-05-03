import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — channel-scoped auth gate.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if channel does not exist
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export async function assertAccess(
  channelId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const cachedChannel = await ctx.authGate.getChannel(channelId);
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
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:read", scope),
  ]);
}
