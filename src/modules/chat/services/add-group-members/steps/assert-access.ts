import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess logic for add-group-members.
 * Gates by asserting the user's explicit member authorization into the group prior to mutating.
 * Hard-validates that the channel is of type "GROUP_DM" under the exact requested workspaceId.
 */
export async function assertAccess(
  workspaceId: string,
  groupId: string,
  ctx: ServiceContext
): Promise<{ groupName: string }> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) {
    throw AppError.notFound("Group not found", "CHANNEL_NOT_FOUND");
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
    ctx.authGate.assertChannelMember(groupId),
    ctx.permissions.assert("chat:channel:member:add", scope),
  ]);

  // Secondary structural validation: ensures type filter matches GROUP_DM bounds
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM",
      deletedAt: null,
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found", "CHANNEL_NOT_FOUND");
  }

  return { groupName: group.name ?? "" };
}
