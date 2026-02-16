import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { s3Client } from "../s3-client";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { RedisLatestSnapshot, HistoricalSnapshotReason } from "./types";
import {
  SNAPSHOT_CONFIG,
  STREAM_TRIM_CONFIG,
  S3_RETRY_ATTEMPTS,
  S3_RETRY_DELAY_MS,
  SNAPSHOT_TTL_SECONDS,
} from "./config";

const logger = createLogger("whiteboard:stream-worker-v2:s3-sync");

/**
 * S3 Sync Manager - Threshold-Based S3 Sync
 *
 * Strategy:
 * - Redis writes: EVERY batch (required for real-time getBoardSnapshot queries)
 * - S3 writes: ONLY when thresholds hit (count/time/size)
 *
 * When threshold hits:
 * 1. Sync latest.yjs to S3 (matches Redis latest)
 * 2. Create historical timestamped snapshot
 * 3. Reset tracking counters in Redis
 * 4. Trim stream (safe after backup exists)
 */

/**
 * Sync latest snapshot to S3 (continuous)
 */
export async function syncLatestToS3(
  boardId: string,
  snapshot: Uint8Array,
  streamId: string,
  version: number
): Promise<void> {
  let attempt = 0;

  while (attempt < S3_RETRY_ATTEMPTS) {
    try {
      await s3Client.putSnapshot(
        boardId,
        snapshot,
        {
          streamId,
          timestamp: new Date().toISOString(),
          size: snapshot.length.toString(),
        },
        true // isLatest = true (overwrites latest.yjs)
      );

      logger.debug("✅ S3 latest.yjs synced", {
        boardId,
        version,
        streamId,
        size: snapshot.length,
      });

      return; // Success
    } catch (s3Error) {
      attempt++;

      logger.warn(
        `⚠️ S3 sync failed (attempt ${attempt}/${S3_RETRY_ATTEMPTS})`,
        {
          boardId,
          error: s3Error,
        }
      );

      if (attempt < S3_RETRY_ATTEMPTS) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, S3_RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries failed - log error
  logger.error("❌ S3 sync failed after retries", {
    boardId,
    version,
    attempts: S3_RETRY_ATTEMPTS,
  });

  throw new Error("S3 sync failed");
}

/**
 * Check if historical snapshot should be created
 */
export async function checkHistoricalThresholds(
  boardId: string,
  metrics: RedisLatestSnapshot
): Promise<void> {
  if (!SNAPSHOT_CONFIG.SYNC_LATEST_CONTINUOUS) {
    return; // Historical snapshots disabled
  }

  // Trigger 1: Update count threshold
  if (metrics.updatesSinceLastHistorical >= SNAPSHOT_CONFIG.COUNT_THRESHOLD) {
    await createHistoricalSnapshot(boardId, metrics, "count-threshold");
    return;
  }

  // Trigger 2: Time interval threshold
  const timeSince = Date.now() - metrics.lastHistoricalTimestamp;
  if (timeSince >= SNAPSHOT_CONFIG.TIME_INTERVAL_MS) {
    await createHistoricalSnapshot(boardId, metrics, "time-threshold");
    return;
  }

  // Trigger 3: Memory size threshold
  const snapshot = Buffer.from(metrics.snapshot, "base64");
  const sizeMB = snapshot.length / (1024 * 1024);
  if (sizeMB >= SNAPSHOT_CONFIG.MEMORY_THRESHOLD_MB) {
    await createHistoricalSnapshot(boardId, metrics, "memory-threshold");
    return;
  }
}

/**
 * Create timestamped historical snapshot in S3
 */
async function createHistoricalSnapshot(
  boardId: string,
  metrics: RedisLatestSnapshot,
  reason: HistoricalSnapshotReason
): Promise<void> {
  const snapshot = Buffer.from(metrics.snapshot, "base64");
  const timestamp = Date.now();

  try {
    // 1. Sync latest.yjs to S3 (overwrite)
    await s3Client.putSnapshot(
      boardId,
      snapshot,
      {
        streamId: metrics.streamId,
        timestamp: new Date(timestamp).toISOString(),
        size: snapshot.length.toString(),
      },
      true // isLatest = true (overwrites boards/{id}/latest.yjs)
    );

    logger.debug("✅ S3 latest.yjs synced", {
      boardId,
      streamId: metrics.streamId,
    });

    // 2. Create timestamped historical snapshot
    await s3Client.putSnapshot(
      boardId,
      snapshot,
      {
        streamId: metrics.streamId,
        timestamp: new Date(timestamp).toISOString(),
        size: snapshot.length.toString(),
        reason,
      },
      false // isLatest = false (creates boards/{id}/snapshots/{timestamp}.yjs)
    );

    logger.info("📸 Historical snapshot created + latest synced", {
      boardId,
      streamId: metrics.streamId,
      elementCount: metrics.elementCount,
      reason,
      sizeMB: Math.round((snapshot.length / 1024 / 1024) * 100) / 100,
    });

    // 3. Reset historical tracking in Redis
    const updated: RedisLatestSnapshot = {
      ...metrics,
      updatesSinceLastHistorical: 0,
      lastHistoricalTimestamp: timestamp,
    };

    await appRedis.setex(
      WhiteboardKeys.SnapshotLatest(boardId),
      SNAPSHOT_TTL_SECONDS,
      JSON.stringify(updated)
    );

    // 4. Trim stream (safe now that historical snapshot exists in S3)
    await trimStreamIfSafe(boardId, metrics.streamId);
  } catch (error) {
    logger.error("❌ Historical snapshot creation failed", {
      boardId,
      error,
      reason,
    });

    // Don't throw - non-critical failure
  }
}

/**
 * Safe stream trimming (only after historical snapshot)
 */
async function trimStreamIfSafe(
  boardId: string,
  snapshotStreamId: string
): Promise<void> {
  const streamKey = WhiteboardKeys.BoardStream(boardId);

  try {
    // Check stream length
    if (STREAM_TRIM_CONFIG.MIN_LENGTH > 0) {
      const streamInfo = await appRedis.xinfo("STREAM", streamKey);
      const streamLength = (streamInfo as any).length || 0;

      if (streamLength < STREAM_TRIM_CONFIG.MIN_LENGTH) {
        logger.debug("⏭️ Skipping trim - stream too short", {
          boardId,
          streamLength,
          minLength: STREAM_TRIM_CONFIG.MIN_LENGTH,
        });
        return;
      }
    }

    // Check for active subscribers
    if (STREAM_TRIM_CONFIG.REQUIRE_NO_SUBSCRIBERS) {
      const subscribers = await appRedis.smembers(
        WhiteboardKeys.BoardSubscribers(boardId)
      );

      if (subscribers.length > 0) {
        logger.debug("⏭️ Skipping trim - active subscribers", {
          boardId,
          subscriberCount: subscribers.length,
        });
        return;
      }
    }

    // Safe to trim
    await appRedis.xtrim(streamKey, "MINID", snapshotStreamId);

    logger.info("✂️ Stream trimmed", {
      boardId,
      trimmedTo: snapshotStreamId,
    });
  } catch (error) {
    logger.error("❌ Stream trim failed", {
      boardId,
      error,
    });

    // Don't throw - non-critical failure
  }
}
