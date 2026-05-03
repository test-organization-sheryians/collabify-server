import type { ServiceContext } from "@/graphql/types";
import type { CloseThreadInput, CloseThreadOutput } from "../types";

export const close = async (
  input: CloseThreadInput,
  members: { userId: string }[],
  ctx: ServiceContext
): Promise<CloseThreadOutput> => {
  const { threadId } = input;
  const { userId } = ctx.auth!;
  
  // Close thread
  const closedAt = new Date();
  await ctx.db.chatConversation.update({
    where: { id: threadId },
    data: { closedAt },
  });

  // Fanout to all members
  await Promise.all(
    members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-closed",
          payload: {
            threadId,
            closedBy: userId,
            closedAt: closedAt.toISOString(),
            timestamp: closedAt.toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    threadId,
    closedAt,
  };
};
