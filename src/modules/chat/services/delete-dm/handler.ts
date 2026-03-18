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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, dmId } = input;

  // Step 0 — channel member gate (DM uses channelId = dmId)
  const cachedChannel = await ctx.authGate.getChannel(dmId);
  if (!cachedChannel) throw AppError.notFound("DM not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(dmId),
    ctx.permissions.assert("conversation:delete", scope),
  ]);

  // Verify DM exists and user is member (also needed for fanout participants)
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
