import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetLastReadMessageInput } from "./types";

export const handler = async (
  input: GetLastReadMessageInput,
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
