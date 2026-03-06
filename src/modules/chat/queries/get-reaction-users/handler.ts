import { ServiceContext } from "@/graphql/types";
import type { User } from "@prisma/client";
import type { GetReactionUsersInput } from "./types";
import { getReactionUsers } from "@/modules/chat/domain/reactions/redis-helpers";

export const handler = async (
  input: GetReactionUsersInput,
  ctx: ServiceContext
) => {
  const { messageId, emoji, cursor = 0 } = input;

  // ✅ M-8: Verify user has access to conversation
  const message = await ctx.db.chatMessage.findFirst({
    where: {
      id: messageId,
      conversation: {
        members: {
          some: {
            userId: ctx.auth.userId!,
          },
        },
      },
    },
    select: { id: true },
  });

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND_OR_NO_ACCESS");
  }

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
