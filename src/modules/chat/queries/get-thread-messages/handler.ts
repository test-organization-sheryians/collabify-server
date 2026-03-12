import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetThreadMessagesInput } from "./types";

export const handler = async (
  input: GetThreadMessagesInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // Validate parent message access first
  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: input.parentMessageId },
    select: { conversationId: true },
  });
  if (!parentMessage) throw AppError.notFound("Message not found");

  const cachedChannel = await ctx.authGate.getChannel(parentMessage.conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(parentMessage.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

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
