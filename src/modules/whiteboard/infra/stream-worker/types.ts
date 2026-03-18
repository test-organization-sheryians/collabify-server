/**
 * Stream Worker V2 Type Definitions
 *
 * Stateless architecture - no in-memory Y.Doc storage
 */

/**
 * Redis snapshot structure (source of truth)
 */
export interface RedisLatestSnapshot {
  snapshot: string; // Base64 Y.Doc binary
  streamId: string; // Last stream ID applied
  version: number; // Monotonic counter
  updatedAt: number; // Timestamp
}

/**
 * Stream update from Redis
 */
export interface StreamUpdate {
  id: string; // Stream ID (e.g. "1737123456789-0")
  boardId: string; // Board ID
  data: Uint8Array; // Y.js binary update
}

/**
 * Worker metrics (lightweight, no Y.Docs)
 */
export interface WorkerMetrics {
  boardsProcessed: number;
  updatesProcessed: number;
  snapshotsCreated: number;
  s3SyncSuccesses: number;
  s3SyncFailures: number;
  redisErrors: number;
  avgProcessingTimeMs: number;
}

/**
 * Worker state (minimal - no caches)
 */
export interface WorkerState {
  isRunning: boolean;
  knownGroups: Set<string>;
  metrics: WorkerMetrics;
}
