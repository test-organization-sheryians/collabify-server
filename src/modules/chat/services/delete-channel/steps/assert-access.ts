import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteChannelInput } from "../types";

/**
 * assertAccess logic for delete-channel.
 * Guards explicit destructors by fetching native mapped `deletedAt` configurations assuring target
 * channels are actively archived prior to triggering `.delete()` hooks.
 */
export async function assertAccess(
  input: DeleteChannelInput,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, channelId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  
  if (!cachedChannel.projectId) {
    throw AppError.badRequest("Channel must belong to a project to evaluate permissions.");
  }
  
  const scope = { 
    type: "project" as const, 
    id: cachedChannel.projectId, 
    workspaceId: cachedChannel.workspaceId 
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:delete", scope),
  ]);

  // Fetch channel (still needed for archived check + workspace consistency)
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found");
  }

  // Check if channel is archived
  if (!channel.deletedAt) {
    throw AppError.badRequest("Channel must be archived before deletion");
  }

  // Check permissions (workspace admin check would go here if we had that field)
  // For now, allow any mapped member to cleanly initiate hard deletion over archived queries
  // TODO: Add proper workspace admin check when available
}
