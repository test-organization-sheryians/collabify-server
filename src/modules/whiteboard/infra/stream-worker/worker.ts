import { createLogger } from "@/shared/lib/logger";
import type { WorkerState } from "./types";
import { WORKER_GROUP_NAME, CONSUMER_NAME } from "./config";
import {
  startConsumptionLoop,
  startRecoveryLoop,
  startMetricsLoop,
} from "./worker-loops";
import { thresholdRegistry } from "./processor";

const logger = createLogger("whiteboard:stream-worker-v2");

/**
 * Whiteboard Stream Worker V2 - Stateless Architecture
 *
 * Main worker orchestrator and lifecycle management
 *
 * Key Features:
 * - Stateless: No in-memory Y.Doc storage
 * - Extensible thresholds: Plugin-based threshold system
 * - Single rebuild path: Full XRANGE on threshold met
 * - Atomic operations: Lua script for Redis + stream trim
 * - Memory efficient: ~100MB (down from 1GB)
 */

export const whiteboardStreamWorkerV2 = {
  state: null as WorkerState | null,

  async init() {
    logger.info("═══════════════════════════════════════════════════════");
    logger.info("🚀 Starting Whiteboard Stream Worker V2 (Stateless)");
    logger.info("═══════════════════════════════════════════════════════");

    // Initialize minimal worker state (no caches)
    this.state = {
      isRunning: true,
      knownGroups: new Set<string>(),
      metrics: {
        boardsProcessed: 0,
        updatesProcessed: 0,
        snapshotsCreated: 0,
        s3SyncSuccesses: 0,
        s3SyncFailures: 0,
        redisErrors: 0,
        avgProcessingTimeMs: 0,
      },
    };

    logger.info("📋 Worker Configuration:", {
      group: WORKER_GROUP_NAME,
      consumer: CONSUMER_NAME,
      architecture: "Stateless (single rebuild path)",
    });

    // Get actual threshold values from registry
    const streamLengthThreshold =
      thresholdRegistry.getThreshold("stream-length");
    const thresholdConfig = streamLengthThreshold?.getConfig();

    logger.info("🎯 Threshold System Initialized:", {
      extensible: true,
      registeredThresholds: thresholdRegistry
        .getRegisteredThresholds()
        .map((t: any) => t.name),
      streamLengthEnabled: thresholdConfig?.enabled ?? false,
      streamLengthMax: (thresholdConfig as any)?.maxLength ?? "N/A",
    });

    // Start loops
    logger.info("🔄 Starting worker loops...");
    this.consumptionLoop();
    this.recoveryLoop();
    this.metricsLoop();

    logger.info("✅ Worker V2 started successfully");
    logger.info("═══════════════════════════════════════════════════════");
  },

  consumptionLoop() {
    if (!this.state) return;
    logger.info("🔄 Starting consumption loop...");
    void startConsumptionLoop(this.state);
  },

  recoveryLoop() {
    if (!this.state) return;
    logger.info("♻️  Starting recovery loop...");
    void startRecoveryLoop(this.state);
  },

  metricsLoop() {
    if (!this.state) return;
    logger.info("📊 Starting metrics loop...");
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
// process.on("SIGTERM", () => {
//   logger.info("SIGTERM received, initiating graceful shutdown");
//   void whiteboardStreamWorkerV2.shutdown();
// });

// process.on("SIGINT", () => {
//   logger.info("SIGINT received, initiating graceful shutdown");
//   void whiteboardStreamWorkerV2.shutdown();
// });
