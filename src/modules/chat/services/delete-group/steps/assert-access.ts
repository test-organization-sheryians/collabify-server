import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteGroupInput } from "../types";

export interface AssertAccessOutput {
  members: { userId: string }[];
}

/**
 * assertAccess logic for delete-group.
 * Isolates RBAC checks mapped to `chat:channel:delete` project scopes inherently.
 * Evaluates safe Prisma structural bounds validating `"GROUP_DM"` object restrictions mapped directly
 * against actively joined returning Arrays natively before deletion calls trigger loops.
 */
export async function assertAccess(
  input: DeleteGroupInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, groupId } = input;
  const { userId } = ctx.auth;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) throw AppError.notFound("Group not found");
  if (!cachedChannel.projectId) {
    throw AppError.badRequest("Channel must belong to a project to evaluate permissions.");
  }
  
  const scope = { 
    type: "project" as const, 
    id: cachedChannel.projectId, 
    workspaceId: cachedChannel.workspaceId 
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(groupId),
    ctx.permissions.assert("chat:channel:delete", scope),
  ]);

  // Verify group exists and user is member (still needed to get members for fanout)
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or access denied");
  }

  // Yield the fetched active participant maps cleanly downstream preventing re-fetches
  return { members: group.members };
}
