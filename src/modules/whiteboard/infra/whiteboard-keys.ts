/**
 * Whiteboard Redis Key Patterns
 *
 * Extends KeyFactory for whiteboard module
 */

/**
 * Redis key factory for whiteboard module
 */
export const WhiteboardKeys = {
  // Streams
  BoardStream: (boardId: string) => `board:${boardId}:stream`,
  BoardSequence: (boardId: string) => `board:${boardId}:sequence`,

  // State Cache (Worker)
  BoardSnapshot: (boardId: string) => `board:${boardId}:snapshot`, // Redis cache of Y.Doc state

  // Backpressure & Health
  BoardCircuitBreaker: (boardId: string) => `board:${boardId}:circuit_breaker`,

  // Subscribers & Presence
  BoardSubscribers: (boardId: string) => `board:${boardId}:subscribers`,
  UserState: (boardId: string, userId: string) =>
    `board:${boardId}:user:${userId}:state`,

  // Ephemeral Events (Pub/Sub Channels)
  BoardEvents: (boardId: string) => `board:${boardId}:events`,
  BoardCursors: (boardId: string) => `board:${boardId}:cursors`,
  BoardSelections: (boardId: string) => `board:${boardId}:selections`,
  BoardPresence: (boardId: string) => `board:${boardId}:presence`,

  // Cursor Position Cache
  CursorPosition: (boardId: string, userId: string) =>
    `board:${boardId}:cursor:${userId}`,

  // Selection Cache
  UserSelection: (boardId: string, userId: string) =>
    `board:${boardId}:selection:${userId}`,

  // Deduplication
  DedupeKey: (boardId: string, dedupeId: string) =>
    `board:${boardId}:dedupe:${dedupeId}`,

  // Locks
  BoardLock: (boardId: string) => `board:${boardId}:lock`,
  SnapshotLock: (boardId: string) => `board:${boardId}:snapshot:lock`,

  // Cached Snapshots (for performance)
  CachedSnapshot: (s3Key: string) => `snapshot:${s3Key}`,

  // S3 Keys (Snapshot Storage)
  S3SnapshotTimestamped: (boardId: string, timestamp: number) =>
    `boards/${boardId}/snapshots/${timestamp}.yjs`,
  S3SnapshotLatest: (boardId: string) => `boards/${boardId}/latest.yjs`,
} as const;

/**
 * TTL Values (in seconds)
 */
export const WhiteboardTTLs = {
  SUBSCRIBERS: 86400, // 24 hours
  USER_STATE: 60, // 1 minute (refreshed by heartbeat)
  CURSOR_POSITION: 5, // 5 seconds
  USER_SELECTION: 10, // 10 seconds
  DEDUPE_KEY: 60, // 1 minute
  BOARD_LOCK: 3600, // 1 hour
  SNAPSHOT_LOCK: 300, // 5 minutes
  CACHED_SNAPSHOT: 300, // 5 minutes
} as const;
