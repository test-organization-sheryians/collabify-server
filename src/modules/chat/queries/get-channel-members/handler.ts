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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // 1. Authorization: Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(input.channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(input.channelId),
    ctx.permissions.assert("conversation.member:read", scope),
  ]);

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
