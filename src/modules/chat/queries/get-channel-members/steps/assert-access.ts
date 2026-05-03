import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — Execution Step
 *
 * System Design Decision: Chat is a high-frequency telemetry system.
 * To achieve sub-millisecond latency for channel load times, all auth gates
 * here leverage Redis-cached wrappers rather than querying the DB directly.
 *
 * @throws AppError.unauthorized
 * @throws AppError.notFound
 */
export async function assertAccess(
  channelId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");

  // System Design Decision: Channels are strictly tied to Projects in Phase D,
  // whereas unified DMs exist at the Workspace level. We dynamically resolve
  // the context boundary based on existence of projectId.
  if (!cachedChannel.projectId) {
    throw AppError.badRequest("Channel must belong to a project to evaluate permissions.");
  }
  const scope = { type: "project" as const, id: cachedChannel.projectId, workspaceId: cachedChannel.workspaceId };

  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:member:read", scope),
  ]);
}
