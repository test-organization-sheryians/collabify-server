import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { WorkerState, StreamUpdate } from "./types";
import {
  CONSUMER_NAME,
  WORKER_GROUP_NAME,
  BATCH_COUNT,
  BLOCK_MS,
  RECOVERY_INTERVAL_MS,
} from "./config";
import {
  processBoardBatch,
  ensureConsumerGroup,
  parseStreamEntry,
} from "./processor";

const logger = createLogger("whiteboard:stream-worker-v2:loops");

/**
 * Worker Loops - V2 Stateless Architecture
 *
 * Main consumption and recovery loops
 */

/**
 * Main consumption loop: Poll streams and process batches
 */
export async function startConsumptionLoop(state: WorkerState): Promise<void> {
  logger.info("🔄 Consumption loop started (V2 stateless)");

  while (state.isRunning) {
    try {
      // Get all active board streams
      const pattern = "board:*:stream";
      const cursor = "0";
      const scanResult = await appRedis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

      const streamKeys = (scanResult[1] || []) as string[];

      if (streamKeys.length === 0) {
        // No active boards - wait before next poll
        await new Promise((r) => setTimeout(r, BLOCK_MS * 10)); // 1s
        continue;
      }

      // Process each board stream
      for (const streamKey of streamKeys) {
        await ensureConsumerGroup(streamKey, state.knownGroups);

        try {
          // Read updates from this stream
          const result = (await appRedis.xreadgroup(
            "GROUP",
            WORKER_GROUP_NAME,
            CONSUMER_NAME,
            "COUNT",
            BATCH_COUNT,
            "BLOCK",
            BLOCK_MS,
            "STREAMS",
            streamKey,
            ">"
          )) as any;

          if (!result || result.length === 0) continue;

          // Parse updates
          const updates: StreamUpdate[] = [];

          for (const [key, entries] of result) {
            for (const [id, fields] of entries) {
              const update = parseStreamEntry(key, id, fields as string[]);
              if (update) {
                updates.push(update);
              }
            }
          }

          if (updates.length === 0) continue;

          // Group by boardId and process
          const byBoard = new Map<string, StreamUpdate[]>();

          for (const update of updates) {
            const existing = byBoard.get(update.boardId) || [];
            existing.push(update);
            byBoard.set(update.boardId, existing);
          }

          // Process each board's batch
          for (const [boardId, boardUpdates] of byBoard) {
            const startTime = Date.now();

            await processBoardBatch(boardId, boardUpdates);

            // Update metrics
            state.metrics.boardsProcessed++;
            state.metrics.updatesProcessed += boardUpdates.length;

            const duration = Date.now() - startTime;
            state.metrics.avgProcessingTimeMs =
              state.metrics.avgProcessingTimeMs * 0.9 + duration * 0.1 ||
              duration;
          }

          // Yield event loop between streams
          await new Promise((resolve) => setImmediate(resolve));
        } catch (streamError) {
          logger.error("❌ Stream processing error", {
            streamKey,
            error: streamError,
          });
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("NOGROUP")) {
        logger.warn("⚠️ NOGROUP error - clearing group cache");
        state.knownGroups.clear();
      } else {
        logger.error("❌ Consumption loop error", { err });
        state.metrics.redisErrors++;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info("🛑 Consumption loop stopped");
}

/**
 * Recovery loop: Claim pending updates from dead workers
 */
export async function startRecoveryLoop(state: WorkerState): Promise<void> {
  logger.info("♻️ Recovery loop started");

  while (state.isRunning) {
    try {
      await new Promise((r) => setTimeout(r, RECOVERY_INTERVAL_MS));

      // Get all board streams
      const pattern = "board:*:stream";
      const scanResult = await appRedis.scan(
        "0",
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      const streamKeys = (scanResult[1] || []) as string[];

      for (const streamKey of streamKeys) {
        try {
          // Claim messages pending >60s
          const claimed = (await appRedis.xautoclaim(
            streamKey,
            WORKER_GROUP_NAME,
            CONSUMER_NAME,
            60_000, // 60s idle threshold
            "0-0",
            "COUNT",
            10
          )) as any;

          if (!claimed || !claimed[1] || claimed[1].length === 0) continue;

          logger.info("♻️ Claimed pending updates", {
            streamKey,
            count: claimed[1].length,
          });

          // Parse and process claimed updates
          const updates: StreamUpdate[] = [];

          for (const [id, fields] of claimed[1]) {
            const update = parseStreamEntry(streamKey, id, fields as string[]);
            if (update) {
              updates.push(update);
            }
          }

          if (updates.length === 0) continue;

          // Group by board and process
          const byBoard = new Map<string, StreamUpdate[]>();

          for (const update of updates) {
            const existing = byBoard.get(update.boardId) || [];
            existing.push(update);
            byBoard.set(update.boardId, existing);
          }

          for (const [boardId, boardUpdates] of byBoard) {
            await processBoardBatch(boardId, boardUpdates);
          }
        } catch (claimError) {
          logger.error("❌ Recovery claim failed", {
            streamKey,
            error: claimError,
          });
        }
      }
    } catch (err) {
      logger.error("❌ Recovery loop error", { err });
    }
  }

  logger.info("🛑 Recovery loop stopped");
}

/**
 * Metrics loop: Log worker metrics periodically
 */
export async function startMetricsLoop(state: WorkerState): Promise<void> {
  logger.info("📊 Metrics loop started");

  while (state.isRunning) {
    try {
      await new Promise((r) => setTimeout(r, 60_000)); // Every 60s

      logger.info("📊 Worker metrics", {
        boardsProcessed: state.metrics.boardsProcessed,
        updatesProcessed: state.metrics.updatesProcessed,
        snapshotsCreated: state.metrics.snapshotsCreated,
        historicalSnapshotsCreated: state.metrics.historicalSnapshotsCreated,
        s3SyncSuccesses: state.metrics.s3SyncSuccesses,
        s3SyncFailures: state.metrics.s3SyncFailures,
        redisErrors: state.metrics.redisErrors,
        avgProcessingTimeMs: Math.round(state.metrics.avgProcessingTimeMs),
      });
    } catch (err) {
      logger.error("❌ Metrics loop error", { err });
    }
  }

  logger.info("🛑 Metrics loop stopped");
}
