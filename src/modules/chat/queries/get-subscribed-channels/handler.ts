import { ServiceContext } from "@/graphql/types";
import type { GetSubscribedChannelsInput } from "./types";

export const handler = async (
  input: GetSubscribedChannelsInput,
  ctx: ServiceContext
) => {
  // Return IDs of all channels user is a member of (to populate initial WS subs)
  const memberships = await ctx.db.chatMember.findMany({
    where: {
      userId: ctx.auth.userId || "",
    },
    select: {
      channelId: true,
    },
  });

  return memberships.map((m) => m.channelId);
};
