import { ServiceContext } from "@/graphql/types";
import type { User } from "@prisma/client";
import type { GetMessageReactionsInput } from "./types";
import {
  getReactionCounts,
  hasUserReacted,
  getReactionUsers,
  rebuildReactionCache,
} from "@/modules/chat/domain/reactions/redis-helpers";
import { logger } from "@/shared/logger";

export const handler = async (
  input: GetMessageReactionsInput,
  ctx: ServiceContext
) => {
  const { messageId } = input;
  const userId = ctx.auth.userId!;

  // ✅ M-8: Verify user has access to conversation
  const message = await ctx.db.chatMessage.findFirst({
    where: {
      id: messageId,
      conversation: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      id: true,
      conversationId: true,
    },
  });

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND_OR_NO_ACCESS");
  }

  // 1. Try Redis first (HOT PATH)
  let counts = await getReactionCounts(ctx.redis, messageId);

  if (Object.keys(counts).length === 0) {
    // 2. Cache MISS - Rebuild from DB with lock
    const lockKey = `rebuild:reactions:${messageId}`;
    const acquired = await ctx.redis.setnx(lockKey, "1");

    if (acquired === 1) {
      await ctx.redis.expire(lockKey, 30);

      try {
        // Rebuild cache from DB
        const dbReactions = await ctx.db.messageReaction.findMany({
          where: { messageId },
          select: { emoji: true, userId: true, createdAt: true },
        });

        // Populate Redis
        if (dbReactions.length > 0) {
          await rebuildReactionCache(ctx.redis, messageId, dbReactions);
          counts = await getReactionCounts(ctx.redis, messageId);
        }

        logger.info({ messageId }, "Rebuilt reaction cache from DB");
      } finally {
        await ctx.redis.del(lockKey);
      }
    } else {
      // Wait for another process to rebuild
      await new Promise((r) => setTimeout(r, 100));
      counts = await getReactionCounts(ctx.redis, messageId);
    }
  }

  // 3. Build response
  const reactions = await Promise.all(
    Object.entries(counts).map(async ([emoji, count]) => {
      const [hasReacted, recentUsersResult] = await Promise.all([
        hasUserReacted(ctx.redis, messageId, userId, emoji),
        getReactionUsers(ctx.redis, messageId, emoji, 0, 3),
      ]);

      const recentUsers = await Promise.all(
        recentUsersResult.userIds.map((id) =>
          ctx.dataloaders.chat.userById.load(id)
        )
      );

      // Filter out nulls
      const validUsers: User[] = recentUsers.filter(
        (u: User | null): u is User => u !== null
      );

      return {
        emoji,
        count,
        hasReacted,
        recentUsers: validUsers,
      };
    })
  );

  return reactions;
};
