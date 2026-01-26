import { ServiceContext } from "@/graphql/types";
import type { GetMissingMessagesInput } from "./types";

export const handler = async (
  input: GetMissingMessagesInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.channelId,
      // Lexicographical string comparison for ULIDs works for range
      id: {
        gte: input.rangeStart,
        lte: input.rangeEnd,
      },
    },
    orderBy: {
      id: "asc", // Or createdAt
    },
  });
};
