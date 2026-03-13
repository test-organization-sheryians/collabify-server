import type { ServiceContext } from "@/graphql/types";
import type { User } from "@prisma/client";
import {
  getReactionCounts,
  hasUserReacted,
  getReactionUsers,
  rebuildReactionCache,
} from "@/modules/chat/domain/reactions/redis-helpers";
import { LockingService } from "@/services/locking";
import { createLogger } from "@/shared/lib/logger";
import { randomUUID } from "crypto";

const log = createLogger("chat:queries:get-message-reactions");

const LOCK_TTL_SECONDS = 30;

/**
 * fetchReactions — Redis-first reaction fetch with DB fallback + distributed lock.
 *
 * Hot path:  Redis counts populated → build response immediately.
 * Cold path: Cache miss → acquire rebuild lock (via LockingService) → fetch from DB
 *            → populate Redis → release lock.
 *            Other processes that lose the lock wait 100ms then retry from Redis.
 *
 * Lock ownership uses a per-request UUID to safely release only our own lock
 * (LockingService.release is owner-safe via Lua script).
 */
export async function fetchReactions(
  messageId: string,
  userId: string,
  ctx: ServiceContext
) {
  let counts = await getReactionCounts(ctx.redis, messageId);

  if (Object.keys(counts).length === 0) {
    const lockKey = `rebuild:reactions:${messageId}`;
    const ownerId = randomUUID();
    const acquired = await LockingService.acquire(lockKey, ownerId, LOCK_TTL_SECONDS);

    if (acquired) {
      try {
        const dbReactions = await ctx.db.messageReaction.findMany({
          where: { messageId },
          select: { emoji: true, userId: true, createdAt: true },
        });

        if (dbReactions.length > 0) {
          await rebuildReactionCache(ctx.redis, messageId, dbReactions);
          counts = await getReactionCounts(ctx.redis, messageId);
        }

        log.info("Rebuilt reaction cache from DB", { messageId });
      } finally {
        await LockingService.release(lockKey, ownerId);
      }
    } else {
      await new Promise((r) => setTimeout(r, 100));
      counts = await getReactionCounts(ctx.redis, messageId);
    }
  }

  return Promise.all(
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

      const validUsers: User[] = recentUsers.filter(
        (u: User | null): u is User => u !== null
      );

      return { emoji, count, hasReacted, recentUsers: validUsers };
    })
  );
}
