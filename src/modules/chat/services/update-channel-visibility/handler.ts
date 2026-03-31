import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type {
  UpdateChannelVisibilityInput,
  UpdateChannelVisibilityOutput,
} from "./types";

/**
 * Update Channel Visibility Handler
 *
 * Note: Prisma schema doesn't have isPublic field yet.
 * This is a placeholder implementation - visibility is currently inferred from channel type.
 */
export const handler = async (
  input: UpdateChannelVisibilityInput,
  ctx: ServiceContext
): Promise<UpdateChannelVisibilityOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, channelId, isPublic } = input;

  // Step 0 — channel member gate + permission (before DB fetch)
  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

  //  Verify channel exists (still needed for members fanout)
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

  // TODO: Add isPublic field to Prisma schema and update here
  // For now, we'll just fanout the event
  // const updated = await ctx.db.chatConversation.update({
  //   where: { id: channelId },
  //   data: { isPublic },
  // });

  // Fanout visibility update
  await Promise.all(
    channel.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:channel-visibility-updated",
          payload: {
            channelId,
            isPublic,
            updatedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    channelId,
    isPublic,
  };
};
