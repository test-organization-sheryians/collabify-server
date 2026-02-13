import { LRUCache } from "lru-cache";
import { appRedis as streamRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { BoardState } from "./types";
import {
  LRU_CONFIG,
  CACHE_UPDATE_DEBOUNCE_MS,
  CACHE_TTL_SECONDS,
} from "./config";
import { createSnapshot } from "./snapshot-manager";

const logger = createLogger("whiteboard:stream-worker:cache");

/**
 * LRU Cache Management Module
 *
 * Handles board cache creation, disposal, and Redis cache updates
 */

/**
 * Create LRU cache for Y.Doc instances with disposal hooks
 * **Memory limit:** 2GB (~2000 boards at 1MB each)
 */
export function createBoardCache(
  cacheUpdateTimers: Map<string, NodeJS.Timeout>
): LRUCache<string, BoardState> {
  return new LRUCache<string, BoardState>({
    max: LRU_CONFIG.MAX_BOARDS, // Max 1000 boards
    maxSize: LRU_CONFIG.MAX_SIZE_BYTES, // 2GB limit
    // 🔥 PERFORMANCE FIX: Use tracked approxSize instead of expensive encode
    // Old: Y.encodeStateAsUpdate(state.ydoc).length (serializes full doc!)
    // New: Tracked incrementally + corrected on cache/snapshot writes
    sizeCalculation: (state) => {
      return state.approxSize || LRU_CONFIG.DEFAULT_APPROX_SIZE;
    },
    dispose: (value, key) => {
      // 1. On eviction: snapshot if dirty (fire-and-forget)
      if (value.isDirty && !value.pendingSnapshot) {
        logger.info("LRU eviction: creating snapshot for dirty board", {
          boardId: key,
        });
        void createSnapshot(key, value, "lru-eviction");
      }

      // 2. CRITICAL: Destroy Y.Doc to free internal resources
      value.ydoc.destroy();

      // 3. Clear any pending cache update timers
      const timer = cacheUpdateTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        cacheUpdateTimers.delete(key);
      }
    },
  });
}

/**
 * Schedule debounced cache update (5s window)
 */
export function scheduleCacheUpdate(
  boardId: string,
  state: BoardState,
  cacheUpdateTimers: Map<string, NodeJS.Timeout>
): void {
  const existing = cacheUpdateTimers.get(boardId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    try {
      const snapshot = Y.encodeStateAsUpdate(state.ydoc);

      // 🔥 CRITICAL FIX: Use tracked streamIdWhenLoaded, NOT xrevrange
      // xrevrange returns latest stream ID (which may not be processed yet)
      // We must use the last APPLIED stream ID from state
      const streamId = state.streamIdWhenLoaded;

      // CRITICAL: Versioned cache for validation
      const versionedCache = {
        binary: Buffer.from(snapshot).toString("base64"),
        streamId,
        updatedAt: Date.now(),
      };

      await streamRedis.set(
        WhiteboardKeys.BoardSnapshot(boardId),
        JSON.stringify(versionedCache),
        "EX",
        CACHE_TTL_SECONDS
      );

      // Update accurate size after encode
      state.approxSize = snapshot.length;

      cacheUpdateTimers.delete(boardId);
      logger.debug("Redis cache updated (versioned)", { boardId, streamId });
    } catch (error) {
      logger.error("Cache update failed", { error, boardId });
    }
  }, CACHE_UPDATE_DEBOUNCE_MS);

  cacheUpdateTimers.set(boardId, timer);
}

/**
 * Clear cache update timer for a board
 */
export function clearCacheTimer(
  boardId: string,
  cacheUpdateTimers: Map<string, NodeJS.Timeout>
): void {
  const timer = cacheUpdateTimers.get(boardId);
  if (timer) {
    clearTimeout(timer);
    cacheUpdateTimers.delete(boardId);
  }
}
