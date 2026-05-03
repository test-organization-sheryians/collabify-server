import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess logic for archive-channel.
 * Gates by asserting the user's explicit authorization into the channel prior to mutating.
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
    ctx.permissions.assert("chat:channel:archive", scope),
  ]);
}
