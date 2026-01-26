import { ServiceContext } from "@/graphql/types";
import type { GetLastReadMessageInput } from "./types";

export const handler = async (
  input: GetLastReadMessageInput,
  ctx: ServiceContext
) => {
  const member = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: input.channelId,
        userId: ctx.auth.userId || "",
      },
    },
    select: {
      lastReadMsgId: true,
    },
  });

  return member?.lastReadMsgId ?? null;
};
