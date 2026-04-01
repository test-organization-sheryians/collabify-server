import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnarchiveChannelInput } from "../types";

export interface AssertAccessOutput {
  channel: {
    name: string | null;
    members: { userId: string }[];
  };
}

/**
 * assertAccess logic internally checking:
 * 1. Project-mapped authorization strictly bounded by `"chat:channel:archive"` (both archive and unarchive map to this config token identically).
 * 2. Pre-validating the DB channel object verifying idempotency preventing un-archiving un-archived targets mapped internally against `<BAD_REQUEST>`.
 */
export async function assertAccess(
  input: UnarchiveChannelInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId } = input;

  // Step 0 — channel member gate + permission (before DB fetch mapping WS limits)
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
    ctx.permissions.assert("chat:channel:archive", scope),
  ]);

  // Fetch channel properties securely
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
    },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found", "NOT_FOUND");
  }

  // Idempotency check natively mapping 400 arrays
  if (!channel.deletedAt) {
    throw AppError.badRequest("Channel is not archived", "BAD_REQUEST");
  }

  return { channel };
}
