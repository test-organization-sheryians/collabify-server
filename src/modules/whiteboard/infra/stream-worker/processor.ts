import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { WhiteboardKeys } from "../whiteboard-keys";
import { s3Client } from "../s3-client";
import type { RedisLatestSnapshot, StreamUpdate } from "./types";
import { WORKER_GROUP_NAME, SNAPSHOT_TTL_SECONDS } from "./config";
import { syncLatestToS3, checkHistoricalThresholds } from "./s3-sync";

const logger = createLogger("whiteboard:stream-worker-v2:processor");

/**
 * Stream Processor V2 - Stateless Architecture
 *
 * Load → Apply → Save pattern with continuous S3 sync
 */

/**
 * Process batch of updates for a single board (stateless)
 */
export async function processBoardBatch(
  boardId: string,
  updates: StreamUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  const startTime = Date.now();

  try {
    // 1. LOAD: Get latest snapshot from Redis
    let snapshot: Uint8Array;
    let version = 0;
    let updatesSinceHistorical = 0;
    let lastHistoricalTime = Date.now();

    const cached = await appRedis.get(WhiteboardKeys.SnapshotLatest(boardId));

    if (cached) {
      // Redis hit - use existing snapshot
      const parsed = JSON.parse(cached) as RedisLatestSnapshot;
      snapshot = Buffer.from(parsed.snapshot, "base64");
      version = parsed.version;
      updatesSinceHistorical = parsed.updatesSinceLastHistorical || 0;
      lastHistoricalTime = parsed.lastHistoricalTimestamp || Date.now();

      logger.debug("📥 Loaded snapshot from Redis", {
        boardId,
        version,
        streamId: parsed.streamId,
      });
    } else {
      // Cold start - load from S3
      logger.info("🆕 Cold start - loading from S3", { boardId });

      const s3Snapshot = await s3Client.getLatestSnapshot(boardId);

      if (s3Snapshot) {
        snapshot = s3Snapshot.data;
        version = 0; // S3 cold start - reset version
      } else {
        // New board - start empty
        const emptyDoc = new Y.Doc();
        emptyDoc.getArray("elements"); // Initialize Y.Array structure
        emptyDoc.getMap("assets");
        snapshot = Y.encodeStateAsUpdate(emptyDoc);
        emptyDoc.destroy();

        logger.info("📝 New board - starting empty", { boardId });
      }
    }

    // 2. APPLY: Merge updates into temp Y.Doc
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, snapshot);

    for (const update of updates) {
      Y.applyUpdate(tempDoc, update.data);
    }

    const newSnapshot = Y.encodeStateAsUpdate(tempDoc);
    const elementCount = tempDoc.getArray("elements").length;
    const lastStreamId = updates[updates.length - 1].id;

    // 3. SAVE: Write to Redis
    const redisData: RedisLatestSnapshot = {
      snapshot: Buffer.from(newSnapshot).toString("base64"),
      streamId: lastStreamId,
      version: version + 1,
      updatedAt: Date.now(),
      elementCount,
      updatesSinceLastHistorical: updatesSinceHistorical + updates.length,
      lastHistoricalTimestamp: lastHistoricalTime,
    };

    await appRedis.setex(
      WhiteboardKeys.SnapshotLatest(boardId),
      SNAPSHOT_TTL_SECONDS,
      JSON.stringify(redisData)
    );

    logger.info("✅ Batch processed, Redis updated", {
      boardId,
      updateCount: updates.length,
      version: version + 1,
      elementCount,
      latencyMs: Date.now() - startTime,
    });

    // 4. CLEANUP: Destroy temp Y.Doc (GC immediately)
    tempDoc.destroy();

    // 5. ACK: Mark updates as processed (after Redis success)
    for (const { id } of updates) {
      await appRedis.xack(
        WhiteboardKeys.BoardStream(boardId),
        WORKER_GROUP_NAME,
        id
      );
    }

    // 6. THRESHOLD CHECK: S3 sync + historical snapshot
    // ✅ On threshold hit: Sync BOTH Redis latest + S3 latest + S3 historical
    // ✅ Redis already updated above (for real-time queries)
    // ✅ This syncs S3 to match Redis + creates timestamped backup
    await checkHistoricalThresholds(boardId, redisData);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error("❌ Batch processing failed", {
      boardId,
      updateCount: updates.length,
      error,
      latencyMs,
    });

    // Don't ACK - updates will be retried
    throw error;
  }
}

/**
 * Ensure consumer group exists for stream
 */
export async function ensureConsumerGroup(
  streamKey: string,
  knownGroups: Set<string>
): Promise<void> {
  if (knownGroups.has(streamKey)) return;

  try {
    await appRedis.xgroup(
      "CREATE",
      streamKey,
      WORKER_GROUP_NAME,
      "0",
      "MKSTREAM"
    );
    knownGroups.add(streamKey);
    logger.info("✅ Consumer group created", { streamKey });
  } catch (err: any) {
    if (err?.message?.includes("BUSYGROUP")) {
      knownGroups.add(streamKey);
    } else {
      logger.error("❌ Failed to create consumer group", { err, streamKey });
    }
  }
}

/**
 * Parse Redis stream entry into StreamUpdate
 */
export function parseStreamEntry(
  streamKey: string,
  id: string,
  fields: string[]
): StreamUpdate | null {
  const data: Record<string, string> = {};

  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const boardId = data.boardId;
  const updateB64 = data.update;

  if (!boardId || !updateB64) {
    logger.warn("⚠️ Invalid stream entry - missing data", { streamKey, id });
    return null;
  }

  return {
    id,
    boardId,
    data: Buffer.from(updateB64, "base64"),
  };
}
