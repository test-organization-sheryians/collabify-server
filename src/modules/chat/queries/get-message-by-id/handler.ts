import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetMessageByIdInput } from "./types";

export const handler = async (
  input: GetMessageByIdInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const msg = await ctx.db.chatMessage.findUnique({
    where: { id: input.messageId },
    select: { conversationId: true }
  });
  if (!msg) throw AppError.notFound("Message not found");

  const cachedChannel = await ctx.authGate.getChannel(msg.conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(msg.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  return await ctx.db.chatMessage.findUnique({
    where: { id: input.messageId },
  });
};
