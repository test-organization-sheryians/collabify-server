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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, channelId, description } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("channel:update", scope),
  ]);

  // Update description (topic field in Prisma)
  const updated = await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      topic: description || null,
    },
  });

  // Fanout update event
  const members = await ctx.db.chatMember.findMany({
    where: { conversationId: channelId },
    select: { userId: true },
  });
  await Promise.all(
    members.map(async (member: { userId: string }) => {
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
