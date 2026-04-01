import type { ServiceContext } from "@/graphql/types";
import type { DeleteChannelInput, DeleteChannelOutput } from "../types";

/**
 * Hard deletes target channels via cascading destructors inside Prisma globally.
 */
export const runDelete = async (
  input: DeleteChannelInput,
  ctx: ServiceContext
): Promise<DeleteChannelOutput> => {
  const { channelId } = input;
  // const { userId } = ctx.auth!;

  // Get all members for fanout before deletion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const members = await ctx.db.chatMember.findMany({
    where: { conversationId: channelId },
    select: { userId: true },
  });

  // Hard delete channel (cascades to messages, members, etc.)
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
  //           workspaceId: input.workspaceId,
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
