import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetMessagesAfterCursorInput } from "./types";

export const handler = async (
  input: GetMessagesAfterCursorInput,
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
    },
    take: input.limit,
    skip: 1, // Skip the cursor itself
    cursor: { id: input.afterCursor },
    orderBy: {
      createdAt: "asc", // We want valid chronological history forward
    },
    select: {
      id: true,
      conversationId: true,
      authorUserId: true,
      content: true,
      type: true,
      sequence: true,
      streamId: true,
      createdAt: true,
      deletedAt: true,
      metadata: true,
      parentMessageId: true, // For inline replies (message-reference)
    },
  });
};
