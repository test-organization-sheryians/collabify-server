/**
 * Stream Worker Integration for Reaction Persistence
 *
 * This module adds batching logic to collect reaction events from Redis streams
 * and enqueue them for async DB persistence in batches of 100 or every 5 seconds.
 *
 * INTEGRATION POINT: Add to stream-worker.ts handleMessage() switch statement
 */

import { reactionQueue } from "@/modules/chat/jobs/queues";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:domain:reactions:batch");

// Batch state (in-memory collection)
let reactionBatch: Array<{
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: number;
  action: "add" | "remove";
}> = [];

let lastFlushTime = Date.now();
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;
let isFlushingInProgress = false;

/**
 * Add reaction event to batch and flush if threshold reached
 */
export const queueReactionPersistence = async (event: {
  type: "chat:reaction-added" | "chat:reaction-removed";
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: number;
}): Promise<void> => {
  const { type, messageId, userId, emoji, timestamp } = event;

  // Add to batch
  reactionBatch.push({
    messageId,
    userId,
    emoji,
    timestamp,
    action: type === "chat:reaction-added" ? "add" : "remove",
  });

  // Check flush conditions
  const timeSinceLastFlush = Date.now() - lastFlushTime;
  const shouldFlush =
    reactionBatch.length >= BATCH_SIZE ||
    timeSinceLastFlush >= FLUSH_INTERVAL_MS;

  if (shouldFlush) {
    await flushReactionBatch();
  }
};

/**
 * Flush current batch to persistence queue
 */
export const flushReactionBatch = async (): Promise<void> => {
  if (isFlushingInProgress || reactionBatch.length === 0) return;

  isFlushingInProgress = true;

  const batchToFlush = [...reactionBatch];
  reactionBatch = [];

  try {
    await reactionQueue.add("persist-reactions", {
      reactions: batchToFlush,
    });

    lastFlushTime = Date.now(); // ✅ Only update on success

    logger.info("Reaction batch enqueued for persistence", {
      count: batchToFlush.length,
    });
  } catch (error: any) {
    logger.error("Failed to enqueue reaction batch", {
      error,
      count: batchToFlush.length,
    });

    // Re-add to batch (retry on next flush)
    reactionBatch.unshift(...batchToFlush);
  } finally {
    isFlushingInProgress = false;
  }
};

/**
 * Periodic flush for reactions that didn't hit batch size
 * Call this from stream worker's heartbeat loop
 */
export const periodicFlush = async (): Promise<void> => {
  const timeSinceLastFlush = Date.now() - lastFlushTime;

  if (reactionBatch.length > 0 && timeSinceLastFlush >= FLUSH_INTERVAL_MS) {
    await flushReactionBatch();
  }
};

// Export batch state for monitoring
export const getReactionBatchStatus = () => ({
  batchSize: reactionBatch.length,
  timeSinceLastFlush: Date.now() - lastFlushTime,
});
