import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/** Channel-scoped auth gate for get-messages-delta. */
export async function assertAccess(
  conversationId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const cachedChannel = await ctx.authGate.getChannel(conversationId);
  if (!cachedChannel) {
    throw AppError.notFound("Conversation not found", "CHANNEL_NOT_FOUND");
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
    ctx.authGate.assertChannelMember(conversationId),
    ctx.permissions.assert("chat:channel:read", scope),
  ]);
}
