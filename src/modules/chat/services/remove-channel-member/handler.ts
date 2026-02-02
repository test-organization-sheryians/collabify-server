import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type {
  RemoveChannelMemberInput,
  RemoveChannelMemberOutput,
} from "./types";

export const handler = async (
  input: RemoveChannelMemberInput,
  ctx: ServiceContext
): Promise<RemoveChannelMemberOutput> => {
  const { userId: actorId } = ctx.auth;
  if (!actorId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId, userId: targetUserId } = input;

  // Verify channel exists
  const channel = await ctx.db.chatConversation.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "CHANNEL",
      deletedAt: null,
    },
  });

  if (!channel) {
    throw AppError.notFound("Channel not found");
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
    throw AppError.notFound("User is not a member of this channel");
  }

  // Remove member
  await ctx.db.chatMember.delete({
    where: {
      conversationId_userId: {
        conversationId: channelId,
        userId: targetUserId,
      },
    },
  });

  // Fanout to removed user
  await ctx.redis.publish(
    `user:${targetUserId}:events`,
    JSON.stringify({
      type: "chat:channel-member-removed",
      payload: {
        channelId,
        channelName: channel.name,
        removedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    })
  );

  return {
    success: true,
    channelId,
    userId: targetUserId,
  };
};
