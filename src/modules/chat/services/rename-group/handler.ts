import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RenameGroupInput, RenameGroupOutput } from "./types";

export const handler = async (
  input: RenameGroupInput,
  ctx: ServiceContext
): Promise<RenameGroupOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, groupId, name } = input;

  // Verify group exists and user is member
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      members: { some: { userId } },
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or access denied");
  }

  // Update name
  const updated = await ctx.db.chatConversation.update({
    where: { id: groupId },
    data: { name },
  });

  // Fanout to all members
  await Promise.all(
    group.members.map(async (member) => {
      await ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: "chat:group-renamed",
          payload: {
            groupId,
            name,
            renamedBy: userId,
            timestamp: new Date().toISOString(),
          },
        })
      );
    })
  );

  return {
    success: true,
    groupId: updated.id,
    name: updated.name || name,
  };
};
