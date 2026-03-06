import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type {
  UpdateChannelDescriptionInput,
  UpdateChannelDescriptionOutput,
} from "./types";

export const handler = async (
  input: UpdateChannelDescriptionInput,
  ctx: ServiceContext
): Promise<UpdateChannelDescriptionOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, channelId, description } = input;

  // Verify channel exists
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
    throw AppError.notFound("Channel not found");
  }

  // Update description (topic field in Prisma)
  const updated = await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      topic: description || null,
    },
  });

  // Fanout update event
  await Promise.all(
    channel.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-description-updated",
          payload: {
            channelId,
            description: description || null,
            updatedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId: updated.id,
    description: updated.topic,
  };
};
