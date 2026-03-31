import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — gate step for getChannelMembers.
 *
 * Checks (in order, parallelised):
 *  1. ctx.authGate.getChannel       → Redis GET auth:chan:{id}  (DB fallback)
 *  2. ctx.authGate.assertChannelMember → Redis GET auth:chan:{id}:member:{userId} (DB fallback)
 *  3. ctx.permissions.assert("chat:channel:member:read") → Redis permission cache
 *
 * The DB fetch in step 2 only runs on a cold cache — all three checks
 * are sub-millisecond on a warm cache. Non-members are blocked here before
 * the member list query ever runs.
 *
 * @throws AppError 401  if authGate/permissions context is missing
 * @throws AppError 404  if channel does not exist
 * @throws AppError 403  if caller is not a channel member or lacks permission
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
    ctx.permissions.assert("chat:channel:member:read", scope),
  ]);
}
