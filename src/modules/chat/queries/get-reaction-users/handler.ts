import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { User } from "@prisma/client";
import type { GetReactionUsersInput } from "./types";
import { getReactionUsers } from "@/modules/chat/domain/reactions/redis-helpers";

export const handler = async (
  input: GetReactionUsersInput,
  ctx: ServiceContext
) => {
  const { messageId, emoji, cursor = 0 } = input;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // ✅ M-8: Verify user has access to conversation
  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    throw AppError.notFound("Message not found");
  }

  const cachedChannel = await ctx.authGate.getChannel(message.conversationId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(message.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  const { userIds, nextCursor } = await getReactionUsers(
    ctx.redis,
    messageId,
    emoji,
    cursor,
    20
  );

  const users = await Promise.all(
    userIds.map((id) => ctx.dataloaders.chat.userById.load(id))
  );

  // Filter out nulls
  const validUsers: User[] = users.filter(
    (u: User | null): u is User => u !== null
  );

  return {
    users: validUsers,
    nextCursor,
  };
};
