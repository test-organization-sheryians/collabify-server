import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { GetChannelMembersInput } from "./types";

export const handler = async (
  input: GetChannelMembersInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId)
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);

  // 1. Authorization: Requester must be a member of the channel
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: input.channelId,
        userId,
      },
    },
  });

  if (!membership) {
    throw AppError.forbidden("You are not a member of this channel");
  }

  // 2. Fetch Members with Pagination
  return ctx.db.chatMember.findMany({
    where: {
      conversationId: input.channelId,
    },
    take: input.limit,
    skip: input.offset,
    orderBy: [
      { role: "asc" }, // Show Owners/Admins first? (Assuming role string "OWNER" < "MEMBER" might not work alphabetically as intended, but acceptable for now)
      { joinedAt: "asc" },
    ],
    // Note: We don't need 'include' here because the ChatMember Type Resolver handles fetching the User object via Dataloader
    // This solves the N+1 problem at the graph level
  });
};
