import { ServiceContext } from "@/graphql/types";
import type { GetMessagesDeltaInput } from "./types";

export const handler = async (
  input: GetMessagesDeltaInput,
  ctx: ServiceContext
) => {

    
  return await ctx.db.chatMessage.findMany({
    where: {
      conversationId: input.conversationId,
      streamId: {
        gt: input.afterStreamId,
      },
    },
    orderBy: {
      streamId: "asc",
    },
    take: input.limit,
  });
};
