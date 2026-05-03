import type { ServiceContext } from "@/graphql/types";
import type { DeleteGroupInput, DeleteGroupOutput } from "../types";

/**
 * Hard destruct cascade mapped bounds alongside mapped WebSocket array loops natively executing "chat:group-deleted" maps correctly.
 */
export const runDelete = async (
  input: DeleteGroupInput,
  members: { userId: string }[],
  ctx: ServiceContext
): Promise<DeleteGroupOutput> => {
  const { groupId } = input;
  const userId = ctx.auth?.userId as string;

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: groupId },
  });

  // Fanout to all members
  await Promise.all(
    members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-deleted",
          payload: {
            groupId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    groupId,
  };
};
