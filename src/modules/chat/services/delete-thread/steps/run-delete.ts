import { ServiceContext } from "@/graphql/types";
import type { DeleteThreadInput, DeleteThreadOutput } from "../types";

/**
 * runDelete logic for delete-thread.
 * Executes hard delete in DB and Redis fanout.
 */
export async function runDelete(
  input: DeleteThreadInput,
  members: { userId: string }[],
  ctx: ServiceContext
): Promise<DeleteThreadOutput> {
  const { userId } = ctx.auth!;
  const { workspaceId, threadId } = input;

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: threadId },
  });

  // Fanout to all members
  await Promise.all(
    members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:thread-deleted",
          payload: {
            threadId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    threadId,
  };
}
