import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RemoveChannelMemberInput } from "../types";

export interface AssertAccessOutput {
  channel: {
    id: string;
    name: string;
  };
}

/**
 * assertAccess logic internally orchestrating validation limits locally enforcing:
 * 1. Project level limits bounding natively `chat:channel:member:remove`.
 * 2. Strict CUID queries resolving database lookups yielding mapped domain states natively throwing `NOT_FOUND` on mismatches.
 */
export async function assertAccess(
  input: RemoveChannelMemberInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId: actorId } = ctx.auth;
  if (!actorId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId, userId: targetUserId } = input;

  // Step 0 — channel member gate + permission (before DB fetch)
  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) {
    throw AppError.notFound("Channel not found", "NOT_FOUND");
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
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:member:remove", scope),
  ]);

  // Verify channel exists 
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found", "NOT_FOUND");
  }

  // Verify member exists
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: channelId,
        userId: targetUserId,
      },
    },
  });

  if (!membership) {
    throw AppError.notFound("User is not a member of this channel", "NOT_FOUND");
  }

  return { channel: { id: channel.id, name: channel.name as string } };
}
