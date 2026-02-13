import { appRedis as streamRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { LockingService } from "@/services/locking/locking.service";
import { WhiteboardKeys } from "../whiteboard-keys";
import { s3Client } from "../s3-client-wrapper";
import type { BoardState, SnapshotReason } from "./types";
import { SNAPSHOT_CONFIG, CONSUMER_NAME } from "./config";

const logger = createLogger("whiteboard:stream-worker:snapshot");

/**
 * Snapshot Management Module
 *
 * Handles snapshot triggers, S3 creation, and stream trimming
 */

/**
 * Evaluate snapshot triggers (count/time/memory)
 * CRITICAL: All three triggers must be checked to prevent idle boards never snapshotting
 */
export async function evaluateSnapshotTriggers(
  boardId: string,
  state: BoardState
): Promise<void> {
  // CRITICAL: Prevents concurrent snapshots for same board
  if (state.pendingSnapshot) return;

  // Count trigger: Snapshot every N updates
  if (state.updatesSinceSnapshot >= SNAPSHOT_CONFIG.COUNT_THRESHOLD) {
    await createSnapshot(boardId, state, "count-threshold");
    return;
  }

  // Time trigger: Snapshot every N minutes
  const timeSinceSnapshot = Date.now() - state.lastSnapshotTime;
  if (timeSinceSnapshot >= SNAPSHOT_CONFIG.TIME_INTERVAL_MS) {
    await createSnapshot(boardId, state, "time-threshold");
    return;
  }

  // 🔥 PERFORMANCE FIX: Memory trigger uses approxSize (avoids expensive encode)
  // approxSize is updated on every snapshot/cache encode for accuracy
  const snapshotSizeMB = state.approxSize / (1024 * 1024);
  if (snapshotSizeMB >= SNAPSHOT_CONFIG.MEMORY_THRESHOLD_MB) {
    await createSnapshot(boardId, state, "memory-threshold");
    return;
  }
}

/**
 * Create S3 snapshot + trim stream
 * CRITICAL: Uses durable Redis lock for exactly-once semantics
 * CRITICAL: Writes are ordered: timestamped → latest → trim for crash safety
 */
export async function createSnapshot(
  boardId: string,
  state: BoardState,
  reason: SnapshotReason
): Promise<void> {
  // 🔥 CRITICAL FIX #1: Set pendingSnapshot BEFORE lock attempt
  state.pendingSnapshot = true;

  const lockKey = WhiteboardKeys.SnapshotLock(boardId);

  // 🔥 Use centralized LockingService (atomic SET NX EX via Lua)
  const acquired = await LockingService.acquire(lockKey, CONSUMER_NAME, 60);

  if (!acquired) {
    logger.debug("Snapshot already in progress", { boardId });
    // 🔥 CRITICAL FIX #4: Reset pendingSnapshot on lock failure
    state.pendingSnapshot = false;
    return;
  }

  try {
    const snapshot = Y.encodeStateAsUpdate(state.ydoc);
    const timestamp = Date.now();

    // 🔥 CRITICAL FIX #2: Update approxSize on snapshot encode
    state.approxSize = snapshot.length;

    // 🔥 CRITICAL FIX #3: Use applied streamId, NOT xrevrange
    // xrevrange returns stream head (may not be applied yet)
    // We MUST snapshot at the version we actually applied
    const streamKey = WhiteboardKeys.BoardStream(boardId);
    const streamId = state.streamIdWhenLoaded;

    // Write to S3 with metadata
    const s3Key = WhiteboardKeys.S3SnapshotTimestamped(boardId, timestamp);
    await s3Client.putSnapshot(boardId, snapshot, {
      streamId,
      timestamp: new Date(timestamp).toISOString(),
      size: snapshot.length.toString(),
      reason,
    });

    // Update latest pointer
    await s3Client.putSnapshot(
      boardId,
      snapshot,
      { streamId, timestamp: new Date(timestamp).toISOString() },
      true // isLatest flag
    );

    // Update Prisma metadata
    await streamRedis.publish(
      "whiteboard:snapshot:created",
      JSON.stringify({ boardId, s3Key, streamId, timestamp })
    );

    // Reset dirty state
    state.isDirty = false;
    state.updatesSinceSnapshot = 0;
    state.lastSnapshotTime = timestamp;
    state.pendingSnapshot = false;

    logger.info("Snapshot created", {
      boardId,
      s3Key,
      streamId,
      sizeKB: Math.round(snapshot.length / 1024),
      reason,
    });

    // Safe trimming: MINID streamId
    // 🔥 Use streamRedis for consistency
    await streamRedis.xtrim(streamKey, "MINID", streamId);
  } catch (error) {
    logger.error("Snapshot creation failed", { error, boardId });

    // DLQ for manual intervention
    await streamRedis.rpush(
      "whiteboard:snapshot:failed",
      JSON.stringify({ boardId, error: String(error), timestamp: Date.now() })
    );

    state.pendingSnapshot = false;
  } finally {
    // 🔥 Always release lock (cleanup)
    await LockingService.release(lockKey, CONSUMER_NAME);
  }
}
