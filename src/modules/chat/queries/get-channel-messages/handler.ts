import { ServiceContext } from "@/graphql/types";
import type { GetChannelMessagesInput } from "./types";

export const handler = async (
  input: GetChannelMessagesInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.channelId,
      parentMessageId: null, // Only top-level messages
    },
    take: input.limit,
    skip: input.beforeCursor ? 1 : 0,
    cursor: input.beforeCursor ? { id: input.beforeCursor } : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });
};
