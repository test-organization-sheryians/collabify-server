import { ServiceContext } from "@/graphql/types";
import type { GetMessageByIdInput } from "./types";

export const handler = async (
  input: GetMessageByIdInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatMessage.findUnique({
    where: { id: input.messageId },
  });
};
