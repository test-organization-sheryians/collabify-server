import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { User } from "@prisma/client";
import type { GetMessageReactionsInput } from "./types";
import {
  getReactionCounts,
  hasUserReacted,
  getReactionUsers,
  rebuildReactionCache,
} from "@/modules/chat/domain/reactions/redis-helpers";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:queries:get-reactions");

export const handler = async (
  input: GetMessageReactionsInput,
  ctx: ServiceContext
) => {
  const { messageId } = input;
  const userId = ctx.auth.userId!;

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

        logger.info("Rebuilt reaction cache from DB", { messageId });
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
