import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RemoveGroupMemberInput } from "../types";

export interface AssertAccessOutput {
  group: {
    id: string;
    name: string;
  };
}

/**
 * assertAccess logic internally orchestrating validation limits locally enforcing:
 * 1. Project level limits bounding natively `chat:channel:member:remove`.
 * 2. Strict queries resolving database lookups mapped securely throwing `NOT_FOUND` tracing payloads.
 */
export async function assertAccess(
  input: RemoveGroupMemberInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId: actorId } = ctx.auth;
  if (!actorId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, groupId, userId: targetUserId } = input;

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
    ctx.permissions.assert("chat:channel:member:remove", scope), // Groups use same scope rules natively
  ]);

  // Verify group exists
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found", "NOT_FOUND");
  }

  // Verify target membership exists
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: groupId,
        userId: targetUserId,
      },
    },
  });

  if (!membership) {
    throw AppError.notFound("User is not a member of this group", "NOT_FOUND");
  }

  return { group: { id: group.id, name: group.name as string } };
}
