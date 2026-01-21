import { ServiceContext } from "@/graphql/types";
import type { GetChannelUnreadCountInput } from "./types";

export const handler = async (
  input: GetChannelUnreadCountInput,
  ctx: ServiceContext
) => {
  // 1. Get user's membership to find lastReadAt
  const member = await ctx.db.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId: input.channelId,
        userId: ctx.auth.userId || "", // Provided by auth middleware
      },
    },
  });

  if (!member) {
    return 0; // Not a member = 0 unread? Or error?
  }

  // 2. Count messages created after lastReadAt
  return await ctx.db.chatMessage.count({
    where: {
      channelId: input.channelId,
      createdAt: {
        gt: member.lastReadAt,
      },
      authorUserId: {
        not: member.userId, // Don't count own messages
      },
    },
  });
};
