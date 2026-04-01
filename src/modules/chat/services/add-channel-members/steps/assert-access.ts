import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess logic for add-channel-members.
 * Gates by asserting the user's explicit member authorization into the channel prior to mutating.
 * Hard-validates that the channel is of type "CHANNEL" under the exact requested workspaceId.
 */
export async function assertAccess(
  workspaceId: string,
  channelId: string,
  ctx: ServiceContext
): Promise<{ channelName: string }> {
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
    ctx.permissions.assert("chat:channel:member:add", scope),
  ]);

  // Secondary structural validation: ensures type filter matches & bounds match request
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
      deletedAt: null,
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found", "CHANNEL_NOT_FOUND");
  }

  return { channelName: channel.name ?? "" };
}
