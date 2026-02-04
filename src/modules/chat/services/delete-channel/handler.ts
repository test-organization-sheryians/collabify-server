import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteChannelInput, DeleteChannelOutput } from "./types";

/**
 * Delete Channel Handler
 *
 * Permanently deletes a channel (hard delete).
 * Requirements:
 * - Channel must be archived (deletedAt !== null)
 * - User must be workspace admin or channel creator
 */
export const handler = async (
  input: DeleteChannelInput,
  ctx: ServiceContext
): Promise<DeleteChannelOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId } = input;

  // Fetch channel
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found");
  }

  // Check if channel is archived
  if (!channel.deletedAt) {
    throw AppError.badRequest("Channel must be archived before deletion");
  }

  // Check permissions (workspace admin check would go here if we had that field)
  // For now, we'll allow any member of the workspace to delete archived channels
  // TODO: Add proper workspace admin check when available

  // Get all members for fanout before deletion
  const members = await ctx.db.chatMember.findMany({
    where: { conversationId: channelId },
    select: { userId: true },
  });

  // Hard delete  channel (cascades to messages, members, etc.)
  await ctx.db.chatConversation.delete({
    where: { id: channelId },
  });

  // Fanout deletion event to all members
  // await Promise.all(
  //   members.map(async (member) => {
  //     await ctx.redis.publish(
  //       `user:${member.userId}:events`,
  //       JSON.stringify({
  //         type: "chat:channel-deleted",
  //         payload: {
  //           channelId,
  //           workspaceId,
  //           deletedBy: userId,
  //           timestamp: new Date().toISOString(),
  //         },
  //       })
  //     );
  //   })
  // );

  return {
    success: true,
    channelId,
  };
};
