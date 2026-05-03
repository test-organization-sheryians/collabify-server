import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RenameGroupInput } from "../types";

export interface AssertAccessOutput {
  group: {
    id: string;
    members: { userId: string }[];
  };
}

/**
 * assertAccess logic internally orchestrating validation limits:
 * 1. Checks Project mapped authorization strictly mapping `"chat:channel:update"` properties dynamically.
 * 2. Yields explicit `"NOT_FOUND"` domains correctly.
 */
export async function assertAccess(
  input: RenameGroupInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, groupId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) {
    throw AppError.notFound("Group not found", "NOT_FOUND");
  }
  
  if (!cachedChannel.projectId) {
    throw AppError.badRequest(
      "Channel must belong to a project to evaluate permissions.",
      "BAD_REQUEST"
    );
  }
  
  const scope = {
    type: "project" as const,
    id: cachedChannel.projectId,
    workspaceId: cachedChannel.workspaceId,
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(groupId),
    ctx.permissions.assert("chat:channel:update", scope), // Group mutates using Channel capabilities identically
  ]);

  // Verify group exists and user is member natively via DB
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      members: { some: { userId } },
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or access denied", "NOT_FOUND");
  }

  return { group };
}
