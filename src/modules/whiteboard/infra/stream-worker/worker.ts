import { createLogger } from "@/shared/lib/logger";
import type { WorkerState } from "./types";
import { WORKER_GROUP_NAME, CONSUMER_NAME } from "./config";
import {
  startConsumptionLoop,
  startRecoveryLoop,
  startMetricsLoop,
} from "./worker-loops";

const logger = createLogger("whiteboard:stream-worker-v2");

/**
 * Whiteboard Stream Worker V2 - Stateless Architecture
 *
 * Main worker orchestrator and lifecycle management
 *
 * Key Features:
 * - Stateless: No in-memory Y.Doc storage
 * - Continuous S3 sync: Every Redis write → S3 latest.yjs
 * - Historical snapshots: Configurable thresholds
 * - Memory efficient: ~100MB (down from 1GB)
 */

export const whiteboardStreamWorkerV2 = {
  state: null as WorkerState | null,

  async init() {
    // Initialize minimal worker state (no caches)
    this.state = {
      isRunning: true,
      knownGroups: new Set<string>(),
      metrics: {
        boardsProcessed: 0,
        updatesProcessed: 0,
        snapshotsCreated: 0,
        historicalSnapshotsCreated: 0,
        s3SyncSuccesses: 0,
        s3SyncFailures: 0,
        redisErrors: 0,
        avgProcessingTimeMs: 0,
      },
    };

    logger.info("🚀 Starting Whiteboard Stream Worker V2 (Stateless)", {
      group: WORKER_GROUP_NAME,
      consumer: CONSUMER_NAME,
    });

    // Start loops
    this.consumptionLoop();
    this.recoveryLoop();
    this.metricsLoop();
  },

  consumptionLoop() {
    if (!this.state) return;
    void startConsumptionLoop(this.state);
  },

  recoveryLoop() {
    if (!this.state) return;
    void startRecoveryLoop(this.state);
  },

  metricsLoop() {
    if (!this.state) return;
    void startMetricsLoop(this.state);
  },

  async shutdown() {
    if (!this.state) return;

    logger.info("🛑 Shutting down Whiteboard Stream Worker V2...");
    this.state.isRunning = false;

    // Wait for loops to finish (graceful shutdown)
    await new Promise((r) => setTimeout(r, 2000));

    logger.info("✅ Whiteboard Stream Worker V2 shutdown complete", {
      finalMetrics: this.state.metrics,
    });
  },
};

/**
 * Start whiteboard stream worker V2
 */
export const startWhiteboardStreamWorkerV2 = async () => {
  await whiteboardStreamWorkerV2.init();
};

/**
 * Graceful shutdown handlers
 */
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, initiating graceful shutdown");
  void whiteboardStreamWorkerV2.shutdown();
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, initiating graceful shutdown");
  void whiteboardStreamWorkerV2.shutdown();
});
