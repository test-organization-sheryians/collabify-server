import type { ServiceContext } from "@/graphql/types";
import type { DeleteDmInput, DeleteDmOutput } from "../types";

/**
 * Hard deletes target DM conversation cascade alongside active fanout properties logic.
 */
export const runDelete = async (
  input: DeleteDmInput,
  members: { userId: string }[],
  ctx: ServiceContext
): Promise<DeleteDmOutput> => {
  const { dmId } = input;
  const userId = ctx.auth?.userId as string;

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: dmId },
  });

  // Fanout to both participants
  const participants = members.map((m) => m.userId);
  await Promise.all(
    participants.map(async (participantId) => {
      await ctx.redis.publish(
        `user:${participantId}:events`,
        JSON.stringify({
          type: "chat:dm-deleted",
          payload: {
            dmId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    dmId,
  };
};
