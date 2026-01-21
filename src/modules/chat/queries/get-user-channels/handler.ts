import { ServiceContext } from "@/graphql/types";
import type { GetUserChannelsInput } from "./types";

export const handler = async (
  input: GetUserChannelsInput,
  ctx: ServiceContext
) => {
  return await ctx.db.chatChannel.findMany({
    where: {
      members: {
        some: {
          userId: input.userId,
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Or by last activity if we had that denormalized
    },
  });
};
