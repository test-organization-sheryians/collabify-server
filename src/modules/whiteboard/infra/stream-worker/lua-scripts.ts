import type { Redis } from "ioredis";
import { WhiteboardKeys, WhiteboardTTLs } from "../whiteboard-keys";
import type { RedisLatestSnapshot } from "./types";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:stream-worker:lua");

/**
 * Atomic Snapshot Update + Stream Trim
 *
 * Atomically performs:
 * 1. Update Redis snapshot with new state
 * 2. Trim stream - DELETE all updates that were merged into snapshot
 *
 * Architecture:
 * - We XRANGE and merge ALL stream updates into snapshot
 * - After merge, those updates are redundant (already in snapshot)
 * - Trim removes all processed updates up to last_processed_id
 * - New updates arriving after will have ID > last_processed_id
 *
 * This prevents race conditions where:
 * - Worker crashes between Redis update and stream trim
 * - Multiple workers try to trim simultaneously
 *
 * KEYS[1] = snapshot key (board:X:snapshot:latest)
 * KEYS[2] = stream key (board:X:stream)
 * ARGV[1] = snapshot data (JSON string)
 * ARGV[2] = TTL (seconds)
 * ARGV[3] = last_processed_id (e.g., "1000-0")
 *
 * Returns: 1 (success)
 */
export const ATOMIC_SNAPSHOT_UPDATE_SCRIPT = `
local snapshot_key = KEYS[1]
local stream_key = KEYS[2]
local snapshot_data = ARGV[1]
local ttl = tonumber(ARGV[2])
local last_processed_id = ARGV[3]

-- Get stream length before trimming
local stream_len_before = redis.call('XLEN', stream_key)

-- Update Redis snapshot with TTL
redis.call('SETEX', snapshot_key, ttl, snapshot_data)

-- Trim stream - Delete all entries up to and including last_processed_id
-- These updates are now merged into the snapshot and redundant
redis.call('XTRIM', stream_key, 'MINID', last_processed_id)

-- Get stream length after trimming
local stream_len_after = redis.call('XLEN', stream_key)

-- Return diagnostic information
return cjson.encode({
  ok = true,
  trimmedFrom = stream_len_before,
  trimmedTo = stream_len_after,
  removed = stream_len_before - stream_len_after
})
`;

/**
 * Execute atomic snapshot update and stream trim
 *
 * @param lastStreamId - Last stream ID that was processed and merged into snapshot
 *                       All updates up to this ID will be trimmed from stream
 */
export async function executeAtomicSnapshotUpdate(
  redis: Redis,
  boardId: string,
  snapshotB64: string,
  lastStreamId: string
): Promise<void> {
  const snapshotKey = WhiteboardKeys.SnapshotLatest(boardId);
  const streamKey = WhiteboardKeys.BoardStream(boardId);

  const snapshotData = JSON.stringify({
    snapshot: snapshotB64,
    streamId: lastStreamId,
    version: Date.now(),
    updatedAt: Date.now(),
  } as RedisLatestSnapshot);

  const result = await redis.eval(
    ATOMIC_SNAPSHOT_UPDATE_SCRIPT,
    2, // Number of KEYS
    snapshotKey,
    streamKey,
    snapshotData,
    WhiteboardTTLs.SNAPSHOT_LATEST.toString(),
    lastStreamId // ✅ Trim all entries up to this ID (they're merged into snapshot)
  );

  const trimResult = JSON.parse(result as string);

  logger.info("✅ Atomic Redis update + stream trim", {
    boardId,
    streamId: lastStreamId,
    streamLenBefore: trimResult.trimmedFrom,
    streamLenAfter: trimResult.trimmedTo,
    entriesRemoved: trimResult.removed,
  });
}
