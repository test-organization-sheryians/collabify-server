import { appRedis } from "@/infra/redis";
import { KeyFactory } from "@/infra/redis/keys";
import { createLogger } from "@/shared/lib/logger";
import { WhiteboardKeys } from "../whiteboard-keys";
import type { WorkerState, StreamUpdate } from "./types";
import {
  CONSUMER_NAME,
  WORKER_GROUP_NAME,
  BATCH_COUNT,
  BLOCK_MS,
  RECOVERY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  WORKER_TTL_MS,
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
 *
 * FIX B: Replaced O(N) SCAN with coordinator-assigned SMEMBERS.
 * The coordinator's performRebalance() writes board IDs to
 * KeyFactory.BoardAssignment(CONSUMER_NAME) via rendezvous hash.
 * This worker reads only its assigned slice — no cross-instance contention.
 */
export async function startConsumptionLoop(state: WorkerState): Promise<void> {
  logger.info("🔄 Consumption loop started (coordinator-assigned)");

  while (state.isRunning) {
    try {
      // Read boards assigned to this worker by the coordinator
      const assignedBoardIds = await appRedis.smembers(
        KeyFactory.BoardAssignment(CONSUMER_NAME)
      );

      if (assignedBoardIds.length === 0) {
        // No boards assigned yet — coordinator may be initializing or no active boards.
        // Wait before retrying to avoid a tight Redis RTT loop.
        await new Promise((r) => setTimeout(r, BLOCK_MS * 10)); // 1s idle wait
        continue;
      }

      logger.debug("📡 Processing coordinator-assigned boards", {
        count: assignedBoardIds.length,
      });

      // Map board IDs → full stream key names
      const allStreamKeys = assignedBoardIds.map((id) =>
        WhiteboardKeys.BoardStream(id)
      );

      // Track whether anything was consumed this iteration to avoid tight loop
      let processedThisIteration = 0;

      // Process each board stream
      for (const streamKey of allStreamKeys) {
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

          processedThisIteration += updates.length;

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

            await processBoardBatch(state, boardId, boardUpdates);

            // Update metrics
            state.metrics.boardsProcessed++;
            state.metrics.updatesProcessed += boardUpdates.length;

            const duration = Date.now() - startTime;
            state.metrics.avgProcessingTimeMs =
              state.metrics.avgProcessingTimeMs * 0.9 + duration * 0.1 ||
              duration;

            logger.debug("📊 Metrics updated", {
              boardsProcessed: state.metrics.boardsProcessed,
              updatesProcessed: state.metrics.updatesProcessed,
              snapshotsCreated: state.metrics.snapshotsCreated,
              avgProcessingTimeMs: Math.round(
                state.metrics.avgProcessingTimeMs
              ),
            });
          }

          // Yield event loop between streams
          await new Promise((resolve) => setImmediate(resolve));
        } catch (streamError: any) {
          // Stream deleted while worker was blocking on it (e.g. board deleted mid-read).
          // ioredis throws with no message, only a command object — this is expected.
          const isDeletedStreamError =
            !streamError?.message &&
            streamError?.command?.name === "xreadgroup";

          if (isDeletedStreamError) {
            logger.debug("🗑️ Stream deleted mid-read (board deleted)", {
              streamKey,
            });
          } else {
            logger.error("❌ Stream processing error", {
              streamKey,
              error: streamError,
            });
          }
        }
      }

      // Idle backoff: when streams exist but none had new messages,
      // avoid a tight loop that spams logs and wastes Redis RTTs.
      if (processedThisIteration === 0) {
        await new Promise((r) => setTimeout(r, 500));
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
 *
 * FIX B: Uses coordinator-assigned boards (not SCAN) to find streams.
 * FIX C: Prunes ghost consumers from WhiteboardWorkerRegistry before claiming.
 * FIX D: Full cursor-paginated XAUTOCLAIM — drains complete PEL per stream,
 *        not just the first 10 entries. Mirrors the Pages worker pattern exactly.
 */
export async function startRecoveryLoop(state: WorkerState): Promise<void> {
  logger.info("♻️ Recovery loop started");

  while (state.isRunning) {
    try {
      await new Promise((r) => setTimeout(r, RECOVERY_INTERVAL_MS));

      // FIX C: Prune ghost consumers — workers that missed > WORKER_TTL_MS of heartbeats
      const cutoff = Date.now() - WORKER_TTL_MS;
      await appRedis.zremrangebyscore(
        KeyFactory.WhiteboardWorkerRegistry,
        "-inf",
        cutoff
      );
      logger.debug("🧹 Pruned dead whiteboard workers", {
        olderThanMs: WORKER_TTL_MS,
      });

      // FIX B: Read assigned boards from coordinator (not SCAN)
      const assignedBoardIds = await appRedis.smembers(
        KeyFactory.BoardAssignment(CONSUMER_NAME)
      );

      if (assignedBoardIds.length === 0) {
        logger.debug("♻️ No assigned boards for recovery — skipping");
        continue;
      }

      const streamKeys = assignedBoardIds.map((id) =>
        WhiteboardKeys.BoardStream(id)
      );

      for (const streamKey of streamKeys) {
        try {
          // FIX D: Cursor-paginated XAUTOCLAIM — drains the ENTIRE PEL, not just 10 entries.
          // A crashed worker with 500 pending updates will have all 500 claimed in one tick.
          let pelCursor = "0-0";

          while (true) {
            const claimed = (await appRedis.xautoclaim(
              streamKey,
              WORKER_GROUP_NAME,
              CONSUMER_NAME,
              60_000, // 60s idle threshold — only claim truly stale entries
              pelCursor,
              "COUNT",
              100 // 100 per page — safe given processBoardBatch handles each atomically
            )) as any;

            // Redis 7.0+: [nextCursor, [[id,fields],...], [deletedIds]]
            // Redis 6.2:  [nextCursor, [[id,fields],...]]
            const [nextCursor, claimedEntries] = claimed;

            if (claimedEntries && claimedEntries.length > 0) {
              logger.info("♻️ Claimed pending updates", {
                streamKey,
                count: claimedEntries.length,
                cursor: pelCursor,
              });

              // Parse and group by board, then process
              const updates: StreamUpdate[] = [];
              for (const [id, fields] of claimedEntries) {
                const update = parseStreamEntry(
                  streamKey,
                  id,
                  fields as string[]
                );
                if (update) updates.push(update);
              }

              if (updates.length > 0) {
                const byBoard = new Map<string, StreamUpdate[]>();
                for (const update of updates) {
                  const existing = byBoard.get(update.boardId) || [];
                  existing.push(update);
                  byBoard.set(update.boardId, existing);
                }
                for (const [boardId, boardUpdates] of byBoard) {
                  await processBoardBatch(state, boardId, boardUpdates);
                }
              }
            }

            // Drain complete when Redis wraps cursor back to 0-0
            if (nextCursor === "0-0") break;
            pelCursor = nextCursor;
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
 * Heartbeat loop: Publish liveness to WhiteboardWorkerRegistry ZSET
 *
 * FIX C: Writes CONSUMER_NAME with current timestamp score every HEARTBEAT_INTERVAL_MS.
 * The recovery loop uses this ZSET to prune ghost consumers (dead workers whose
 * XREADGROUP Consumer Group entries would block PEL recovery indefinitely).
 *
 * Non-fatal: heartbeat write failures are logged and retried — they do not
 * stop the worker from processing boards.
 */
export async function startHeartbeatLoop(state: WorkerState): Promise<void> {
  logger.info("💓 Heartbeat loop started");

  while (state.isRunning) {
    try {
      await appRedis.zadd(
        KeyFactory.WhiteboardWorkerRegistry,
        Date.now(),
        CONSUMER_NAME
      );
    } catch (err) {
      // Non-fatal: worker keeps processing even if Redis heartbeat write fails.
      // After WORKER_TTL_MS of missed heartbeats, the recovery loop will prune
      // this consumer — but the worker itself continues running.
      logger.error("❌ Heartbeat write failed", { err });
    }
    await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
  }

  logger.info("🛑 Heartbeat loop stopped");
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
