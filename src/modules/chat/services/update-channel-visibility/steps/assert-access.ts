import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UpdateChannelVisibilityInput } from "../types";

export interface AssertAccessOutput {
  channel: {
    id: string;
    members: { userId: string }[];
  };
}

/**
 * assertAccess logic internally checking:
 * 1. Checks Project mapped authorization strictly resolving `"chat:channel:update"` properties dynamically.
 * 2. Pre-caches channel mappings smoothly throwing internal domains.
 */
export async function assertAccess(
  input: UpdateChannelVisibilityInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId: actorId } = ctx.auth;
  if (!actorId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId } = input;

  // Step 0 — channel member gate checking target maps globally limiting DB drops dynamically safely.
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
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

  //  Verify channel exists fetching memberships reliably tracking members manually mapped natively
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found", "NOT_FOUND");
  }

  return { channel };
}
