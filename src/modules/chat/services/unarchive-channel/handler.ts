import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { UnarchiveChannelInput, UnarchiveChannelOutput } from "./types";

export const handler = async (
  input: UnarchiveChannelInput,
  ctx: ServiceContext
): Promise<UnarchiveChannelOutput> => {
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
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found");
  }

  // Check if channel is archived
  if (!channel.deletedAt) {
    throw AppError.badRequest("Channel is not archived");
  }

  // Unarchive channel (set deletedAt to null)
  const updated = await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      deletedAt: null,
      isArchived: false, // Also update isArchived flag
    },
  });

  // Fanout unarchive event
  await Promise.all(
    channel.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-unarchived",
          payload: {
            channelId,
            workspaceId,
            name: channel.name,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId: updated.id,
    name: updated.name || "Unnamed Channel",
  };
};
