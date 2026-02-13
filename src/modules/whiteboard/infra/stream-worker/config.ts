import * as os from "os";

/**
 * Stream Worker Configuration
 *
 * Centralized configuration for whiteboard stream worker
 */

// Worker Identification
export const WORKER_GROUP_NAME = "whiteboard-state-consumers:v1";
export const CONSUMER_NAME = `worker-${os.hostname()}-${process.pid}`;

// Stream Processing
export const BATCH_COUNT = 100; // Process up to 100 updates per batch
export const BLOCK_MS = 2000; // Block for 2s waiting for new stream entries
export const MAX_STREAMS_PER_BATCH = 50; // Cap to prevent starvation

// Timeouts
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const RECOVERY_INTERVAL_MS = 60000; // 60 seconds
export const HEARTBEAT_INTERVAL_MS = 5000; // 5 seconds
export const HEARTBEAT_EVICTION_CHECK_TICKS = 12; // Check every 60s (12 * 5s)

// Cache Settings
export const CACHE_UPDATE_DEBOUNCE_MS = 5000; // 5 seconds
export const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// LRU Cache Configuration
export const LRU_CONFIG = {
  MAX_BOARDS: 1000, // Max 1000 boards
  MAX_SIZE_BYTES: 2_000_000_000, // 2GB limit
  DEFAULT_APPROX_SIZE: 10000, // Default 10KB if not yet tracked
};

// Snapshot Triggers
export const SNAPSHOT_CONFIG = {
  COUNT_THRESHOLD: 1000, // Snapshot every 1000 updates
  TIME_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MEMORY_THRESHOLD_MB: 10, // 10MB stream memory
};

// Stream Health Thresholds
export const HEALTH_THRESHOLDS = {
  WARNING: 500,
  ALERT: 1000,
  CRITICAL: 5000,
  DANGER: 10000,
};

// Stream Replay
export const REPLAY_BATCH_SIZE = 5000;

// Snapshot Locking
export const SNAPSHOT_LOCK_TTL_SECONDS = 60;
