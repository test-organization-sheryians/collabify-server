/**
 * Stream Worker V2 Configuration
 *
 * Simplified configuration with extensible threshold system
 */

import * as os from "os";

// Worker Identification
export const WORKER_GROUP_NAME = "whiteboard-state-consumers:v2";
export const CONSUMER_NAME = `worker-v2-${os.hostname()}-${process.pid}`;

// Stream Processing
export const BATCH_COUNT = 100; // Process up to 100 updates per batch
export const BLOCK_MS = 100; // Block for 100ms waiting for new entries
export const MAX_UPDATES_PER_BATCH = 100; // Limit batch size to prevent OOM

// Threshold Configuration (Extensible)
export const THRESHOLDS = {
  STREAM_LENGTH: {
    enabled: true,
    maxLength: 50,
  },
  // Future thresholds can be added here:
  // TIME_BASED: {
  //   enabled: process.env.ENABLE_TIME_THRESHOLD === "true",
  //   intervalMs: parseInt(process.env.SNAPSHOT_TIME_INTERVAL_MS || "300000"),
  // },
};

// Redis Keys TTL
export const SNAPSHOT_TTL_SECONDS = 3600; // 1 hour

// Worker Loops
export const RECOVERY_INTERVAL_MS = 60_000; // 60 seconds
export const METRICS_INTERVAL_MS = 60_000; // 60 seconds

// Heartbeat & Dead-Worker Pruning
// HEARTBEAT_INTERVAL_MS: how often the worker writes its liveness to WhiteboardWorkerRegistry ZSET.
// WORKER_TTL_MS: workers not seen within this window are considered dead and pruned.
// Must satisfy: WORKER_TTL_MS >= 3 × HEARTBEAT_INTERVAL_MS (tolerates 2 missed beats before prune).
export const HEARTBEAT_INTERVAL_MS = 10_000; // 10 seconds — mirrors Chat stream-worker heartbeat
export const WORKER_TTL_MS = 30_000; // 30 seconds — matches coordinator's zombie threshold
