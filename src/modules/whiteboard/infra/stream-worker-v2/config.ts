/**
 * Stream Worker V2 Configuration
 *
 * Environment-driven configuration for stateless stream worker
 */

import * as os from "os";

// Worker Identification
export const WORKER_GROUP_NAME = "whiteboard-state-consumers:v2";
export const CONSUMER_NAME = `worker-v2-${os.hostname()}-${process.pid}`;

// Stream Processing
export const BATCH_COUNT = 100; // Process up to 100 updates per batch
export const BLOCK_MS = 100; // Block for 100ms waiting for new entries
export const MAX_UPDATES_PER_BATCH = 100; // Limit batch size to prevent OOM

// Historical Snapshot Triggers (configurable via env)
export const SNAPSHOT_CONFIG = {
  COUNT_THRESHOLD: parseInt(process.env.SNAPSHOT_COUNT_THRESHOLD || "1000"),
  TIME_INTERVAL_MS: parseInt(
    process.env.SNAPSHOT_TIME_INTERVAL_MS || String(5 * 60 * 1000)
  ), // 5 min
  MEMORY_THRESHOLD_MB: parseInt(process.env.SNAPSHOT_SIZE_THRESHOLD_MB || "10"),

  // S3 sync policy
  SYNC_LATEST_CONTINUOUS:
    process.env.SNAPSHOT_SYNC_LATEST_CONTINUOUS !== "false", // Default true
};

// Stream Trimming
export const STREAM_TRIM_CONFIG = {
  MIN_LENGTH: 10_000, // Only trim if stream has >10k messages
  REQUIRE_NO_SUBSCRIBERS: true, // Only trim if no active subscribers
  REQUIRE_S3_SYNC: true, // Only trim after S3 sync
};

// Timeouts & Retries
export const RECOVERY_INTERVAL_MS = 60_000; // 60 seconds
export const S3_RETRY_ATTEMPTS = 3;
export const S3_RETRY_DELAY_MS = 1000; // Exponential backoff base

// Redis Keys TTL
export const SNAPSHOT_TTL_SECONDS = 3600; // 1 hour
