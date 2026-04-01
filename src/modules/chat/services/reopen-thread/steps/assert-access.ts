import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { ReopenThreadInput } from "../types";

export interface AssertAccessOutput {
  thread: {
    id: string;
    members: { userId: string }[];
  };
}

/**
 * assertAccess logic internally validating:
 * 1. Checks Project mapped authorization strictly resolving `"chat:channel:update"` properties dynamically.
 * 2. Yields explicit trace strings `"NOT_FOUND"` parsing upstream correctly.
 * 3. Checks natively for `closedAt` preventing idempotency conflicts throwing `"BAD_REQUEST"`.
 */
export async function assertAccess(
  input: ReopenThreadInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, threadId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) {
    throw AppError.notFound("Thread not found", "NOT_FOUND");
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
    ctx.authGate.assertChannelMember(threadId),
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

  // Verify thread exists and user is member natively mapped via DB
  const thread = await ctx.db.chatConversation.findFirst({
    where: {
      id: threadId,
      workspaceId,
      type: "THREAD",
      members: { some: { userId } },
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!thread) {
    throw AppError.notFound("Thread not found or access denied", "NOT_FOUND");
  }

  // Check if thread is already open resolving idempotency constraints securely
  if (!thread.closedAt) {
    throw AppError.badRequest("Thread is already open", "BAD_REQUEST");
  }

  return { thread };
}
