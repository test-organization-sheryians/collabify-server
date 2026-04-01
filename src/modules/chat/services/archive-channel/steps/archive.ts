import type { ServiceContext } from "@/graphql/types";

export const archive = async (
  channelId: string,
  ctx: ServiceContext
) => {
  // Action: Archive (sets both isArchived and deletedAt for soft delete)
  return await ctx.db.chatConversation.update({
    where: { id: channelId },
    data: {
      isArchived: true,
      deletedAt: new Date(), // Set soft delete timestamp
    },
  });
};
