import { appRedis, appRedis as streamRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import type { LRUCache } from "lru-cache";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { BoardState, WorkerState } from "./types";
import {
  CONSUMER_NAME,
  BATCH_COUNT,
  BLOCK_MS,
  MAX_STREAMS_PER_BATCH,
  IDLE_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_EVICTION_CHECK_TICKS,
} from "./config";
import { ensureGroups, safeProcessUpdate } from "./stream-processor";
import { createSnapshot } from "./snapshot-manager";
import { clearCacheTimer } from "./cache-manager";

const logger = createLogger("whiteboard:stream-worker:loops");

/**
 * Worker Loops Module
 *
 * Main consumption loops (heartbeat, consumption, recovery)
 */

/**
 * Heartbeat loop: Register worker liveness + idle board eviction
 */
export async function startHeartbeatLoop(state: WorkerState): Promise<void> {
  logger.info("Heartbeat loop started");
  let tickCount = 0;

  while (state.isRunning) {
    try {
      await appRedis.zadd("sys:workers:registry", Date.now(), CONSUMER_NAME);

      // Every 12 ticks (60s), check for idle boards
      tickCount++;
      if (tickCount % HEARTBEAT_EVICTION_CHECK_TICKS === 0) {
        const now = Date.now();

        for (const [boardId, boardState] of state.boardCache.entries()) {
          const idleTime = now - boardState.lastUpdate;

          if (idleTime > IDLE_TIMEOUT_MS) {
            logger.info("Idle board eviction: no edits for 10min", {
              boardId,
              idleTimeMs: idleTime,
            });

            // 1. Snapshot if dirty
            if (boardState.isDirty) {
              await createSnapshot(boardId, boardState, "idle-timeout");
            }

            // 2. Destroy Y.Doc
            boardState.ydoc.destroy();

            // 3. Remove from cache
            state.boardCache.delete(boardId);

            // 4. Clear timers
            clearCacheTimer(boardId, state.cacheUpdateTimers);
          }
        }
      }

      await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
    } catch (err) {
      logger.error("Whiteboard worker heartbeat failed", { err });
    }
  }
}

/**
 * Main consumption loop: XREADGROUP pattern with batching
 * CRITICAL: Batches prevent stream starvation (hot boards dominating reads)
 */
export async function startConsumptionLoop(state: WorkerState): Promise<void> {
  logger.info("Consumption loop started (XREADGROUP batching)");
  while (state.isRunning) {
    try {
      // 1. Fetch assigned boards
      const boardIds = await streamRedis.smembers(
        `worker:${CONSUMER_NAME}:boards`
      );

      if (boardIds.length === 0) {
        await new Promise((r) => setTimeout(r, BLOCK_MS));
        continue;
      }

      // 2. Process in batches of 50 boards
      for (let i = 0; i < boardIds.length; i += MAX_STREAMS_PER_BATCH) {
        const batch = boardIds.slice(i, i + MAX_STREAMS_PER_BATCH);
        const streamKeys = batch.map((id) => WhiteboardKeys.BoardStream(id));

        // 3. Ensure consumer groups exist
        await ensureGroups(streamKeys, state.knownGroups);

        // 4. XREADGROUP for THIS BATCH ONLY
        const ids = batch.map(() => ">");
        const result = (await streamRedis.xreadgroup(
          "GROUP",
          state.knownGroups.values().next().value ||
            "whiteboard-state-consumers:v1",
          CONSUMER_NAME,
          "COUNT",
          BATCH_COUNT, // 100 updates from this batch
          "BLOCK",
          BLOCK_MS,
          "STREAMS",
          ...streamKeys,
          ...ids
        )) as any; // Redis returns complex nested array structure

        // Early break if no updates (optimization)
        if (!result || result.length === 0) {
          break; // No more work in this tick, exit batch loop
        }

        if (result) {
          for (const [streamKey, updates] of result) {
            for (const [id, fields] of updates) {
              await safeProcessUpdate(
                streamKey,
                id,
                fields as string[],
                state.boardCache,
                state.cacheUpdateTimers
              );
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("NOGROUP")) {
        logger.warn("Whiteboard worker: NOGROUP error, clearing group cache");
        state.knownGroups.clear();
      } else {
        logger.error("Whiteboard consumption loop error", { err });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Recovery loop: Claim pending updates (dead workers)
 */
export async function startRecoveryLoop(state: WorkerState): Promise<void> {
  logger.info("Recovery loop started (XAUTOCLAIM)");
  while (state.isRunning) {
    try {
      await new Promise((r) => setTimeout(r, 60000)); // Every 60s

      const boardIds = await streamRedis.smembers(
        `worker:${CONSUMER_NAME}:boards`
      );

      for (const boardId of boardIds) {
        const streamKey = WhiteboardKeys.BoardStream(boardId);

        try {
          // Claim updates pending > 60s
          const claimed = (await appRedis.xautoclaim(
            streamKey,
            state.knownGroups.values().next().value ||
              "whiteboard-state-consumers:v1",
            CONSUMER_NAME,
            60000, // 60s
            "0-0",
            "COUNT",
            10
          )) as any;

          if (claimed && claimed[1].length > 0) {
            logger.info("Whiteboard worker: claimed dead updates", {
              boardId,
              count: claimed[1].length,
            });

            for (const [id, fields] of claimed[1]) {
              await safeProcessUpdate(
                streamKey,
                id,
                fields as string[],
                state.boardCache,
                state.cacheUpdateTimers
              );
            }
          }
        } catch (err) {
          logger.error("Recovery claim failed", { err, boardId });
        }
      }
    } catch (err) {
      logger.error("Whiteboard recovery loop error", { err });
    }
  }
}
