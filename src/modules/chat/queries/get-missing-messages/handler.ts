import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetMissingMessagesInput } from "./types";

export const handler = async (
  input: GetMissingMessagesInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const cachedChannel = await ctx.authGate.getChannel(input.channelId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(input.channelId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

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
