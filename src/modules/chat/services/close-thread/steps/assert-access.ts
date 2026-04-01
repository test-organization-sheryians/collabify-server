import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { CloseThreadInput } from "../types";

/**
 * assertAccess logic for close-thread.
 * Asserts permissions scoped to `chat:channel:update` and verifies the target thread exists and hasn't been closed.
 */
export async function assertAccess(
  input: CloseThreadInput,
  ctx: ServiceContext
) {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, threadId } = input;
  const { userId } = ctx.auth;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(threadId);
  if (!cachedChannel) {
    throw AppError.notFound("Thread not found", "CHANNEL_NOT_FOUND");
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
    ctx.authGate.assertChannelMember(threadId),
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

  // Verify thread exists and user is member
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
    throw AppError.notFound("Thread not found or access denied", "CHANNEL_NOT_FOUND");
  }

  // Check if already closed
  if (thread.closedAt) {
    throw AppError.badRequest("Thread is already closed");
  }

  return thread.members;
}
