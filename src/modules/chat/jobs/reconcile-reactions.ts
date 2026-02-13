import { Job } from "bullmq";
import { db } from "@/infra/db";
import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:jobs:reconcile-reactions");
import {
  rebuildReactionCache,
  getReactionCounts,
} from "../domain/reactions/redis-helpers";

/**
 * Periodic reconciliation job to detect and fix Redis-DB desync
 *
 * Triggers:
 * 1. Scheduled (every 6 hours)
 * 2. On Redis reconnect
 * 3. Manual trigger via admin API
 */

export interface ReconcileReactionsJob {
  messageIds?: string[]; // Specific messages to reconcile (if empty, reconcile recent)
  forceRebuild?: boolean; // Skip checksum, just rebuild
}

export const reconcileReactionsHandler = async (
  job: Job<ReconcileReactionsJob>
) => {
  const { messageIds, forceRebuild = false } = job.data;

  let targetMessageIds = messageIds;

  // If no specific messages, reconcile messages from last 7 days
  if (!targetMessageIds || targetMessageIds.length === 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentMessages = await db.chatMessage.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        reactions: {
          some: {}, // Only messages with reactions
        },
      },
      select: { id: true },
      take: 1000, // Limit to prevent overload
    });

    targetMessageIds = recentMessages.map((m) => m.id);
  }

  logger.info("Starting reaction reconciliation", {
    count: targetMessageIds.length,
    forceRebuild,
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Clean up reactions for deleted messages (M-4)
  // ═══════════════════════════════════════════════════════════
  const deletedMessages = await db.chatMessage.findMany({
    where: {
      deletedAt: { not: null },
      reactions: {
        some: {}, // Has reactions in database
      },
    },
    select: { id: true },
  });

  if (deletedMessages.length > 0) {
    logger.info("Cleaning up reactions for deleted messages", {
      count: deletedMessages.length,
    });

    for (const msg of deletedMessages) {
      // Delete from database
      await db.messageReaction.deleteMany({
        where: { messageId: msg.id },
      });

      // Clear from Redis
      const redisCounts = await getReactionCounts(appRedis, msg.id);
      const pipeline = appRedis.pipeline();

      for (const emoji of Object.keys(redisCounts)) {
        pipeline.del(`reactions:${msg.id}:${emoji}`);
      }
      pipeline.del(`reaction-counts:${msg.id}`);

      await pipeline.exec();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Reconcile active messages
  // ═══════════════════════════════════════════════════════════
  let desyncCount = 0;
  let rebuiltCount = 0;

  for (const messageId of targetMessageIds) {
    try {
      // 1. Get DB truth
      const dbReactions = await db.messageReaction.findMany({
        where: { messageId },
        select: { emoji: true, userId: true, createdAt: true },
      });

      // 2. Get Redis state
      const redisCounts = await getReactionCounts(appRedis, messageId);

      // 3. Compare checksums
      const dbChecksum = computeReactionChecksum(dbReactions);
      const redisChecksum = computeCountsChecksum(redisCounts);

      if (forceRebuild || dbChecksum !== redisChecksum) {
        // DESYNC DETECTED
        desyncCount++;

        logger.warn("Desync detected, rebuilding cache", {
          messageId,
          dbChecksum,
          redisChecksum,
          dbCount: dbReactions.length,
          redisTotal: Object.values(redisCounts).reduce((a, b) => a + b, 0),
        });

        // 4. Rebuild Redis from DB
        // First, clear existing Redis data
        const pipeline = appRedis.pipeline();

        // Get all emojis from both sources
        const allEmojis = new Set([
          ...dbReactions.map((r) => r.emoji),
          ...Object.keys(redisCounts),
        ]);

        for (const emoji of allEmojis) {
          pipeline.del(`reactions:${messageId}:${emoji}`);
        }
        pipeline.del(`reaction-counts:${messageId}`);
        await pipeline.exec();

        // Rebuild from DB
        if (dbReactions.length > 0) {
          await rebuildReactionCache(appRedis, messageId, dbReactions);
          rebuiltCount++;
        }
      }
    } catch (error: any) {
      logger.error("Failed to reconcile reactions for message", {
        error,
        messageId,
      });
    }

    // Throttle to avoid overwhelming Redis
    if (targetMessageIds.length > 100) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  logger.info("Reaction reconciliation complete", {
    total: targetMessageIds.length,
    desyncCount,
    rebuiltCount,
  });

  return { desyncCount, rebuiltCount };
};

/**
 * Compute checksum from DB reactions
 */
function computeReactionChecksum(
  reactions: Array<{ emoji: string; userId: string; createdAt: Date }>
): string {
  if (reactions.length === 0) return "empty";

  // Sort for deterministic checksum
  const sorted = reactions
    .map((r) => `${r.emoji}:${r.userId}:${r.createdAt.getTime()}`)
    .sort();

  // Simple hash (could use crypto.createHash for better collision resistance)
  return sorted.join("|").length.toString() + "-" + sorted.length;
}

/**
 * Compute checksum from Redis counts
 */
function computeCountsChecksum(counts: Record<string, number>): string {
  if (Object.keys(counts).length === 0) return "empty";

  const sorted = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([emoji, count]) => `${emoji}:${count}`)
    .join("|");

  return (
    sorted.length.toString() +
    "-" +
    Object.values(counts).reduce((a, b) => a + b, 0)
  );
}
