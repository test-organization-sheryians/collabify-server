/**
 * Stream Worker — Entry point.
 *
 * Initialises all Lua scripts, builds WorkerState, and starts the 3 cooperative loops:
 *   - heartbeatLoop  (fire-and-forget)
 *   - recoveryLoop   (fire-and-forget)
 *   - processLoop    (await — blocking main loop)
 *
 * SIGTERM: sets state.isRunning = false → all loops exit after current iteration.
 */

import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";
import { loadAllLuaScripts } from "../infra/lua";
import { ThresholdRegistry } from "./thresholds/index";
import { StreamLengthThreshold } from "./thresholds/stream-length";
import { CooldownThreshold } from "./thresholds/cooldown";
import { processLoop, heartbeatLoop, recoveryLoop } from "./worker-loops";
import {
  CONSUMER_NAME,
  WORKER_INDEX,
  WORKER_COUNT,
  SNAPSHOT_THRESHOLD,
  SNAPSHOT_COOLDOWN_MS,
} from "./config";
import type { WorkerState } from "./types";

const logger = createLogger("pages:stream-worker");

export async function startWorker(
  redis: Redis,
  db: PrismaClient
): Promise<void> {
  logger.info("Stream worker starting", {
    consumerName: CONSUMER_NAME,
    workerIndex: WORKER_INDEX,
    workerCount: WORKER_COUNT,
  });

  // 1. Pre-load all Lua scripts — must complete before any loop touches Redis
  await loadAllLuaScripts(redis);
  logger.info("Lua scripts loaded");

  // 2. Build initial state
  const state: WorkerState = {
    isRunning: true,
    workerIndex: WORKER_INDEX,
    workerCount: WORKER_COUNT,
    consumerName: CONSUMER_NAME,
    lastSeenEpoch: "0",
    thresholdRegistry: buildThresholdRegistry(redis, db),
    metrics: {
      pagesProcessed: 0,
      updatesProcessed: 0,
      snapshotsCreated: 0,
      s3SyncSuccesses: 0,
      s3SyncFailures: 0,
      redisErrors: 0,
      activePagesOwned: 0,
      avgProcessingTimeMs: 0,
      lastCycleMs: 0,
    },
  };

  // 3. Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — stopping worker after current batch");
    state.isRunning = false;
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received — stopping worker");
    state.isRunning = false;
  });

  // 4. Fire-and-forget background loops
  heartbeatLoop(state, redis).catch((err) =>
    logger.error("Heartbeat loop crashed", { err })
  );

  recoveryLoop(state, redis, db).catch((err) =>
    logger.error("Recovery loop crashed", { err })
  );

  // 5. Blocking main loop
  await processLoop(state, redis, db);

  logger.info("Stream worker stopped cleanly");
}

// ─── Threshold Registry Builder ───────────────────────────────────────────────

function buildThresholdRegistry(
  _redis: Redis,
  _db: PrismaClient
): ThresholdRegistry {
  const registry = new ThresholdRegistry();

  // Trigger on stream length — bulk write bursts
  registry.register(new StreamLengthThreshold(SNAPSHOT_THRESHOLD));

  // Trigger on time elapsed — slow/constant pages that never hit length threshold
  registry.register(new CooldownThreshold(SNAPSHOT_COOLDOWN_MS));

  return registry;
}
