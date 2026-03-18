import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — Redis-backed auth gate for getLastReadMessage.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing
 * @throws AppError 404  if channel does not exist
 * @throws AppError 403  if caller is not a member or lacks conversation:read
 */
export async function assertAccess(
  channelId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };

  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("conversation:read", scope),
  ]);
}
