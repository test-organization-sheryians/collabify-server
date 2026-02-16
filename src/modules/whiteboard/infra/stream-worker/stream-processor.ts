import { appRedis, appRedis as streamRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import type { LRUCache } from "lru-cache";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { BoardState } from "./types";
import { WORKER_GROUP_NAME } from "./config";
import { coldStart } from "./board-initializer";
import { scheduleCacheUpdate } from "./cache-manager";
import { evaluateSnapshotTriggers } from "./snapshot-manager";
import { monitorStreamHealth } from "./health-monitor";

const logger = createLogger("whiteboard:stream-worker:processor");

/**
 * Stream Processing Module
 *
 * Handles stream update processing and consumer group management
 */

/**
 * Extract timestamp from Redis stream ID for lag calculation
 * Stream ID format: {milliseconds}-{sequence}
 * Example: "1673456789123-0" → 1673456789123
 */
export function extractStreamTimestamp(streamId: string): number {
  const timestamp = streamId.split("-")[0];
  return parseInt(timestamp, 10);
}

/**
 * Ensure consumer group exists for stream
 */
export async function ensureGroups(
  streamKeys: string[],
  knownGroups: Set<string>
): Promise<void> {
  for (const key of streamKeys) {
    if (knownGroups.has(key)) continue;

    try {
      await appRedis.xgroup("CREATE", key, WORKER_GROUP_NAME, "0", "MKSTREAM");
      knownGroups.add(key);
      logger.info("Consumer group created", { streamKey: key });
    } catch (err: any) {
      if (err?.message?.includes("BUSYGROUP")) {
        knownGroups.add(key);
      } else {
        logger.error("Failed to create group", { err, streamKey: key });
      }
    }
  }
}

/**
 * Safe Y.js update processing with error handling
 */
export async function safeProcessUpdate(
  streamKey: string,
  id: string,
  fields: string[],
  boardCache: LRUCache<string, BoardState>,
  cacheUpdateTimers: Map<string, NodeJS.Timeout>
): Promise<void> {
  try {
    await processUpdate(streamKey, id, fields, boardCache, cacheUpdateTimers);
    await streamRedis.xack(streamKey, WORKER_GROUP_NAME, id);
  } catch (error) {
    logger.error("Y.js update processing failed (will retry via recovery)", {
      error,
      streamKey,
      streamId: id,
    });
  }
}

/**
 * Process single Y.js update from stream
 */
export async function processUpdate(
  streamKey: string,
  id: string,
  fields: string[],
  boardCache: LRUCache<string, BoardState>,
  cacheUpdateTimers: Map<string, NodeJS.Timeout>
): Promise<void> {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const boardId = data.boardId;
  const updateB64 = data.update;

  if (!boardId || !updateB64) {
    logger.warn("Missing boardId or update", { streamKey, id });
    return;
  }

  // 1. Get or load board state
  let state = boardCache.get(boardId);
  if (!state) {
    state = await coldStart(boardId);
    boardCache.set(boardId, state);
    logger.info("Cold start: loaded board into cache", { boardId });
  }

  // 2. Apply update (CRDT merge)
  const update = Buffer.from(updateB64, "base64");
  Y.applyUpdate(state.ydoc, update);
  state.lastUpdate = Date.now();
  state.isDirty = true;
  state.updatesSinceSnapshot++;

  // 🔥 CRITICAL FIX: Update streamIdWhenLoaded after each processed update
  // This ensures cache versioning is accurate
  state.streamIdWhenLoaded = id;

  // ✅ LOG: Verify update applied successfully
  const yElements = state.ydoc.getArray("elements");
  logger.info("✅ Update applied to Y.Doc", {
    boardId,
    streamId: id,
    elementCount: yElements.length,
    updatesSinceSnapshot: state.updatesSinceSnapshot,
    updateSize: update.length,
  });

  // 🔥 FIX: Do NOT accumulate approxSize per update (Yjs deltas compress)
  // approxSize is updated only on snapshot encode (debounced every 5s)

  // 3. Schedule debounced cache update (5s window)
  scheduleCacheUpdate(boardId, state, cacheUpdateTimers);

  // 4. Check snapshot triggers
  await evaluateSnapshotTriggers(boardId, state);

  // 5. Monitor stream health
  await monitorStreamHealth(streamKey, boardId);
}
