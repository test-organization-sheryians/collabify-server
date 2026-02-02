import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteDmInput, DeleteDmOutput } from "./types";

export const handler = async (
  input: DeleteDmInput,
  ctx: ServiceContext
): Promise<DeleteDmOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, dmId } = input;

  // Verify DM exists and user is member
  const dm = await ctx.db.chatConversation.findFirst({
    where: {
      id: dmId,
      workspaceId,
      type: "DM",
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!dm) {
    throw AppError.notFound("DM not found or access denied");
  }

  // Get other participant for fanout
  const otherMember = dm.members.find((m) => m.userId !== userId);

  // Hard delete (cascades to messages, members)
  await ctx.db.chatConversation.delete({
    where: { id: dmId },
  });

  // Fanout to both participants
  const participants = dm.members.map((m) => m.userId);
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
