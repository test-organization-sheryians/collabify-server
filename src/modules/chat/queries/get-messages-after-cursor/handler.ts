import { ServiceContext } from "@/graphql/types";
import type { GetMessagesAfterCursorInput } from "./types";

export const handler = async (
  input: GetMessagesAfterCursorInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.channelId,
    },
    take: input.limit,
    skip: 1, // Skip the cursor itself
    cursor: { id: input.afterCursor },
    orderBy: {
      createdAt: "asc", // We want valid chronological history forward
    },
  });
};
