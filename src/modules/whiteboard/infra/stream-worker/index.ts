/**
 * Whiteboard Stream Worker (V4 Architecture)
 *
 * **Purpose:** Background consumer for whiteboard streams
 * - Consumes updates from Redis Streams (XREADGROUP)
 * - Maintains LRU-bounded Y.Doc cache (max 2GB)
 * - Updates Redis cache (debounced, 5s)
 * - Creates S3 snapshots (trigger-based)
 * - Trims streams safely (MINID only)
 */

export { startWhiteboardStreamWorker, whiteboardStreamWorker } from "./worker";
export type { BoardState, WorkerState, SnapshotReason } from "./types";
