import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteThreadInput } from "../types";

export interface AssertAccessOutput {
  members: { userId: string }[];
}

/**
 * assertAccess logic for delete-thread.
 * Validates authentication, permission, and thread existence.
 */
export async function assertAccess(
  input: DeleteThreadInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, threadId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) throw AppError.notFound("Thread not found");
  
  if (!cachedChannel.projectId) {
    throw AppError.badRequest("Channel must belong to a project to evaluate permissions.");
  }
  
  const scope = { 
    type: "project" as const, 
    id: cachedChannel.projectId, 
    workspaceId: cachedChannel.workspaceId 
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(threadId),
    ctx.permissions.assert("chat:channel:delete", scope),
  ]);

  // Verify thread exists and user is member
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      workspaceId,
      type: "THREAD",
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found or access denied");
  }

  return { members: thread.members };
}
