import { ServiceContext } from "@/graphql/types";
import type { GetThreadMessagesInput } from "./types";

export const handler = async (
  input: GetThreadMessagesInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatMessage.findMany({
    where: {
      parentMessageId: input.parentMessageId,
    },
    take: input.limit,
    skip: input.beforeCursor ? 1 : 0,
    cursor: input.beforeCursor ? { id: input.beforeCursor } : undefined,
    orderBy: {
      createdAt: "asc", // Threads usually read chronologically? Or like Slack? Slack is chrono.
    },
  });
};
