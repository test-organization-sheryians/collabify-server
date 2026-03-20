import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { WhiteboardKeys } from "../whiteboard-keys";
import { s3Client } from "../s3-client";
import type { RedisLatestSnapshot, StreamUpdate, WorkerState } from "./types";
import { WORKER_GROUP_NAME, SNAPSHOT_TTL_SECONDS, THRESHOLDS } from "./config";
import { syncLatestToS3 } from "./s3-sync";
import { ThresholdRegistry } from "./thresholds";
import { StreamLengthThreshold } from "./thresholds/stream-length";
import { executeAtomicSnapshotUpdate } from "./lua-scripts";
import { safeApplyUpdate } from "@/shared/lib/safe-apply-update";

const logger = createLogger("whiteboard:stream-worker-v2:processor");

/**
 * Stream Processor V2 - Simplified Architecture
 *
 * Single rebuild path:
 * 1. Check threshold
 * 2. If met: Full rebuild from stream → Redis → S3
 * 3. If not met: Just ACK updates
 */

// Initialize threshold registry (singleton)
export const thresholdRegistry = new ThresholdRegistry();

// Register stream length threshold with config values
thresholdRegistry.register(
  new StreamLengthThreshold(
    THRESHOLDS.STREAM_LENGTH.maxLength,
    THRESHOLDS.STREAM_LENGTH.enabled
  )
);

/**
 * Process batch of updates for a single board
 */
export async function processBoardBatch(
  state: WorkerState,
  boardId: string,
  updates: StreamUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  const startTime = Date.now();

  logger.info("📦 Processing batch", {
    boardId,
    updateCount: updates.length,
    firstStreamId: updates[0]?.id,
    lastStreamId: updates[updates.length - 1]?.id,
  });

  try {
    // 1. Check if threshold is met
    logger.debug("🔍 Checking thresholds...", { boardId });

    const shouldRebuild = await thresholdRegistry.shouldCreateSnapshot({
      boardId,
      redis: appRedis,
      s3Client,
    });

    if (!shouldRebuild) {
      // Threshold not met - just ACK updates
      logger.info("⏳ Threshold not met - accumulating updates", {
        boardId,
        updateCount: updates.length,
      });

      for (const { id } of updates) {
        await appRedis.xack(
          WhiteboardKeys.BoardStream(boardId),
          WORKER_GROUP_NAME,
          id
        );
      }

      logger.debug("✅ Updates ACKed (threshold not met)", {
        boardId,
        latencyMs: Date.now() - startTime,
      });
      return;
    }

    // 2. Threshold met - Full rebuild from stream
    logger.info("🎯 Threshold met - starting full rebuild", { boardId });
    await rebuildSnapshotFromStream(boardId);

    // Track snapshot creation
    state.metrics.snapshotsCreated++;

    // 3. ACK the xreadgroup-delivered messages to clean the PEL.
    // rebuildSnapshotFromStream trims the stream via XTRIM (Lua), but
    // XTRIM does NOT auto-ACK messages still in PEL. Those orphaned PEL
    // entries would trigger spurious XAUTOCLAIM attempts every 60s.
    // XACK of a trimmed ID is a safe no-op in Redis.
    for (const { id } of updates) {
      await appRedis.xack(
        WhiteboardKeys.BoardStream(boardId),
        WORKER_GROUP_NAME,
        id
      ).catch(() => {}); // safe — trimmed entries can't be ACKd, that's fine
    }

    logger.info("✅ Batch processed successfully", {
      boardId,
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("❌ Batch processing failed", {
      boardId,
      error,
      latencyMs: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Rebuild snapshot from entire stream
 *
 * Flow:
 * 1. Load base snapshot from Redis (or S3 fallback)
 * 2. Create Y.Doc with boardId as GUID
 * 3. XRANGE - Get ALL updates from stream
 * 4. Apply all updates
 * 5. Atomic: Update Redis + Trim stream
 * 6. Sync to S3 latest.yjs
 */
async function rebuildSnapshotFromStream(boardId: string): Promise<void> {
  logger.info("🔄 Starting snapshot rebuild", { boardId });
  const streamKey = WhiteboardKeys.BoardStream(boardId);

  // STEP 1: Load base snapshot from Redis
  logger.debug("📥 STEP 1: Loading base snapshot from Redis...", { boardId });
  let baseSnapshot: Uint8Array | null = null;
  const cached = await appRedis.get(WhiteboardKeys.SnapshotLatest(boardId));

  if (cached) {
    const parsed = JSON.parse(cached) as RedisLatestSnapshot;
    baseSnapshot = Buffer.from(parsed.snapshot, "base64");
    logger.info("✅ Loaded base snapshot from Redis", {
      boardId,
      streamId: parsed.streamId,
      size: baseSnapshot.length,
    });
  } else {
    // Fallback to S3
    logger.debug("📥 Redis miss - trying S3 fallback...", { boardId });
    try {
      const s3Snapshot = await s3Client.getLatestSnapshot(boardId);
      if (s3Snapshot) {
        baseSnapshot = s3Snapshot.data;
        logger.info("✅ Loaded base snapshot from S3", {
          boardId,
          size: baseSnapshot.length,
        });
      } else {
        logger.info("ℹ️  No base snapshot found - starting fresh", { boardId });
      }
    } catch (error) {
      logger.warn("⚠️  S3 fallback failed, starting fresh", {
        boardId,
        error,
      });
    }
  }

  // STEP 2: Create Y.Doc with deterministic GUID
  logger.debug("📝 STEP 2: Creating Y.Doc", { boardId, guid: boardId });
  const doc = new Y.Doc({ guid: boardId });
  doc.getArray("elements");
  doc.getMap("assets");

  if (baseSnapshot) {
    logger.debug("🔄 Applying base snapshot to Y.Doc...", { boardId });
    const applyResult = safeApplyUpdate(
      doc,
      baseSnapshot,
      {
        context: "worker:load-base-snapshot",
        boardId,
        throwOnError: false,
      },
      logger
    );

    if (!applyResult.success) {
      logger.warn("⚠️  Failed to apply base snapshot, starting fresh", {
        boardId,
      });
    } else {
      logger.debug("✅ Base snapshot applied", { boardId });
    }
  }

  // STEP 3: XRANGE - Get ALL updates from stream
  logger.debug("📊 STEP 3: XRANGE - Loading ALL stream updates...", {
    boardId,
  });
  const allUpdates = (await appRedis.xrange(
    streamKey,
    "-",
    "+",
    "COUNT",
    10000
  )) as Array<[string, string[]]>;

  logger.info("📊 Stream updates loaded", {
    boardId,
    updateCount: allUpdates.length,
    firstId: allUpdates[0]?.[0],
    lastId: allUpdates[allUpdates.length - 1]?.[0],
  });

  // STEP 4: Apply all updates
  logger.debug("🔄 STEP 4: Applying all updates to Y.Doc...", { boardId });
  let lastStreamId = "0-0";
  let successfulUpdates = 0;

  for (const [id, fields] of allUpdates) {
    const data = parseStreamFields(fields);
    if (!data) continue;

    const update = Buffer.from(data.update, "base64");

    const result = safeApplyUpdate(
      doc,
      update,
      {
        context: "worker:rebuild-from-stream",
        boardId,
        streamId: id,
        throwOnError: false,
      },
      logger
    );

    if (result.success) {
      lastStreamId = id;
      successfulUpdates++;
    }
  }

  logger.info("✅ Stream updates applied", {
    boardId,
    total: allUpdates.length,
    successful: successfulUpdates,
    failed: allUpdates.length - successfulUpdates,
    lastStreamId,
  });

  // STEP 5: Encode final snapshot
  logger.debug("🔐 STEP 5: Encoding final snapshot...", { boardId });
  const newSnapshot = Y.encodeStateAsUpdate(doc);
  const snapshotB64 = Buffer.from(newSnapshot).toString("base64");

  logger.info("✅ Snapshot encoded", {
    boardId,
    snapshotSize: newSnapshot.length,
  });

  // STEP 6: ATOMIC - Update Redis + Trim stream
  logger.debug("⚛️  STEP 6: ATOMIC - Updating Redis + trimming stream...", {
    boardId,
    lastStreamId,
  });
  await executeAtomicSnapshotUpdate(
    appRedis,
    boardId,
    snapshotB64,
    lastStreamId
  );

  logger.info("✅ Redis updated & stream trimmed atomically", {
    boardId,
    trimmedUpTo: lastStreamId,
  });

  // STEP 7: Update S3 latest.yjs
  logger.debug("☁️  STEP 7: Syncing to S3...", { boardId });
  await syncLatestToS3(boardId, newSnapshot, lastStreamId);

  logger.info("✅ S3 sync complete", { boardId });

  // STEP 8: Cleanup
  doc.destroy();
  logger.debug("🧹 Y.Doc destroyed (cleanup)", { boardId });

  logger.info("🎉 Snapshot rebuild complete", {
    boardId,
    streamLength: allUpdates.length,
    snapshotSize: newSnapshot.length,
  });
}

/**
 * Parse stream fields into structured data
 */
function parseStreamFields(fields: string[]): { update: string } | null {
  const data: Record<string, string> = {};

  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  if (!data.update) {
    logger.warn("⚠️  Invalid stream entry - missing update", { fields });
    return null;
  }

  return { update: data.update };
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
    logger.warn("⚠️  Invalid stream entry - missing data", { streamKey, id });
    return null;
  }

  return {
    id,
    boardId,
    data: Buffer.from(updateB64, "base64"),
  };
}
