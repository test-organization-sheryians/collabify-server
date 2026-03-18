/**
 * Board Resource Cleanup
 *
 * Called after soft delete. Failures are logged but non-fatal —
 * the board is already deleted from the DB at this point.
 *
 * Architecture: Fire-and-forget from handler. Each section is
 * independently try/caught so a Redis failure won't block S3 cleanup.
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { s3Client as awsS3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";
import { WhiteboardKeys } from "../../infra/whiteboard-keys";
import type { Redis } from "ioredis";

const logger = createLogger("whiteboard:services:delete-board:cleanup");

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Clean up all resources associated with a deleted board.
 * Intended to be called fire-and-forget after the DB soft delete.
 */
export async function cleanupBoardResources(
  boardId: string,
  redis: Redis
): Promise<void> {
  logger.info("Starting board resource cleanup", { boardId });

  // Run Redis and S3 cleanup independently so one failure doesn't block the other
  await Promise.allSettled([
    cleanupRedisKeys(boardId, redis).catch((err) =>
      logger.error("Redis cleanup failed", { boardId, err })
    ),
    archiveBoardSnapshots(boardId).catch((err) =>
      logger.error("S3 archival failed", { boardId, err })
    ),
  ]);

  logger.info("Board resource cleanup complete", { boardId });
}

// ============================================================================
// REDIS CLEANUP
// ============================================================================

async function cleanupRedisKeys(boardId: string, redis: Redis): Promise<void> {
  // 1. Fetch subscriber list before deleting (needed for per-user key cleanup)
  const subscribers = await redis
    .smembers(WhiteboardKeys.BoardSubscribers(boardId))
    .catch(() => [] as string[]);

  // 2. Pipeline: delete all known fixed keys
  const pipeline = redis.pipeline();

  // Streams & sequences
  pipeline.del(WhiteboardKeys.BoardStream(boardId));
  pipeline.del(WhiteboardKeys.BoardSequence(boardId));

  // State cache
  pipeline.del(WhiteboardKeys.SnapshotLatest(boardId));

  // Subscribers set
  pipeline.del(WhiteboardKeys.BoardSubscribers(boardId));

  // Per-user state for each known subscriber
  for (const userId of subscribers) {
    pipeline.del(WhiteboardKeys.UserState(boardId, userId));
    pipeline.del(WhiteboardKeys.CursorPosition(boardId, userId));
    pipeline.del(WhiteboardKeys.UserSelection(boardId, userId));
  }

  // Presence
  pipeline.del(WhiteboardKeys.BoardPresence(boardId));

  // Locks
  pipeline.del(WhiteboardKeys.BoardLock(boardId));
  pipeline.del(WhiteboardKeys.SnapshotLock(boardId));

  // Circuit breakers & loop prevention
  pipeline.del(WhiteboardKeys.BoardCircuitBreaker(boardId));
  pipeline.del(WhiteboardKeys.LoopCircuitBreaker(boardId));
  pipeline.del(WhiteboardKeys.UpdateTrace(boardId));

  await pipeline.exec();

  logger.info("Redis fixed keys deleted", {
    boardId,
    subscriberCount: subscribers.length,
  });

  // 3. Pattern-based cleanup for dynamic keys (dedupe, rate limits)
  await scanAndDelete(redis, `board:${boardId}:dedupe:*`);
  await scanAndDelete(redis, `board:${boardId}:rate:*`);
  // Note: DEL on the stream key above already destroys all consumer groups atomically.
  // No separate XGROUP DESTROY needed.
}

/**
 * SCAN + DEL for dynamic key patterns. Uses cursor-based iteration
 * to avoid blocking Redis with large key sets.
 */
async function scanAndDelete(redis: Redis, pattern: string): Promise<void> {
  let cursor = "0";
  let totalDeleted = 0;

  do {
    const [newCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = newCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== "0");

  if (totalDeleted > 0) {
    logger.debug("Pattern keys deleted", { pattern, totalDeleted });
  }
}

// ============================================================================
// S3 ARCHIVAL
// ============================================================================

/**
 * Archive board snapshots to deleted/ prefix for 30-day retention.
 * S3 lifecycle policy handles hard deletion after retention period.
 *
 * Layout:
 *   boards/{boardId}/latest.yjs                → deleted/{boardId}/latest.yjs
 *   boards/{boardId}/snapshots/{ts}.yjs        → deleted/{boardId}/snapshots/{ts}.yjs
 */
async function archiveBoardSnapshots(boardId: string): Promise<void> {
  const bucket = env.S3_WHITEBOARD_BUCKET;

  // Archive latest snapshot
  const latestKey = WhiteboardKeys.S3SnapshotLatest(boardId);
  const archivedLatestKey = `deleted/${boardId}/latest.yjs`;

  const latestArchived = await copyS3Object(
    bucket,
    latestKey,
    archivedLatestKey
  );

  // Archive all timestamped snapshots
  const snapshotPrefix = `boards/${boardId}/snapshots/`;
  const archivedSnapshotPrefix = `deleted/${boardId}/snapshots/`;

  const timestampedKeys = await listS3Objects(bucket, snapshotPrefix);

  const archivedTimestamped: string[] = [];
  for (const key of timestampedKeys) {
    const filename = key.split("/").pop() ?? key;
    const destKey = `${archivedSnapshotPrefix}${filename}`;
    const ok = await copyS3Object(bucket, key, destKey);
    if (ok) archivedTimestamped.push(key);
  }

  logger.info("S3 snapshots archived", {
    boardId,
    latestArchived,
    timestampedCount: archivedTimestamped.length,
  });

  // Delete originals only after successful archival
  const keysToDelete: string[] = [];
  if (latestArchived) keysToDelete.push(latestKey);
  keysToDelete.push(...archivedTimestamped);

  if (keysToDelete.length > 0) {
    await deleteS3Objects(bucket, keysToDelete);
    logger.info("S3 originals deleted", {
      boardId,
      count: keysToDelete.length,
    });
  }
}

async function copyS3Object(
  bucket: string,
  sourceKey: string,
  destKey: string
): Promise<boolean> {
  try {
    await awsS3Client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`,
        Key: destKey,
      })
    );
    return true;
  } catch (err: any) {
    if (err?.name === "NoSuchKey") {
      logger.debug("S3 object not found, skipping copy", { sourceKey });
      return false;
    }
    throw err;
  }
}

async function listS3Objects(
  bucket: string,
  prefix: string
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await awsS3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function deleteS3Objects(bucket: string, keys: string[]): Promise<void> {
  // S3 DeleteObjects supports up to 1000 keys per request
  const chunks = chunkArray(keys, 1000);

  for (const chunk of chunks) {
    await awsS3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
