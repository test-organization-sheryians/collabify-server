/**
 * Central Key Factory for Chat Infrastructure
 * Prevents key mismatches between Coordinator, Workers, and API.
 */
export const KeyFactory = {
  // --- Data Plane (Streams) ---

  /**
   * The ordered log for a specific channel.
   * Format: stream:conversation:{conversationId}
   */
  ConversationStream: (conversationId: string) =>
    `stream:conversation:${conversationId}`,

  // --- Signal Plane (Discovery) ---

  /**
   * Set of conversations that have pending data / are active.
   * The Coordinator watches this set to assign streams.
   * Format: sys:conversations:active
   */
  ActiveConversations: "sys:conversations:active",

  /**
   * Set of whiteboard boards that are active.
   * The Coordinator watches this ZSET to assign board streams to workers.
   * Format: sys:active:whiteboards
   */
  ActiveBoards: "sys:active:whiteboards",

  // --- Control Plane (Coordination) ---

  /**
   * Set of streams assigned to a specific worker.
   * Format: sys:worker:{workerId}:streams
   */
  WorkerAssignment: (workerId: string) => `sys:worker:${workerId}:streams`,

  /**
   * Interrupt Signal Stream for a specific worker.
   * Used to wake up a worker from XREAD BLOCK to refresh assignments.
   * Format: sys:worker:{id}:signal
   */
  WorkerSignal: (workerId: string) => `sys:worker:${workerId}:signal`,

  // Coordinator 2.0 Keys
  CoordinatorLock: "sys:coordinator:lock",
  EpochWorkers: "sys:epoch:workers",
  EpochConversations: "sys:epoch:conversations",
  AssignmentHash: (workerId: string) =>
    `sys:worker:${workerId}:assignment_hash`,

  /**
   * Dead Letter Queue Stream for Worker Failures.
   * Format: sys:stream:dlq
   */
  DLQ: "sys:stream:dlq",

  /**
   * Set of alive workers (Heartbeat Registry).
   * Format: sys:workers:registry
   */
  WorkerRegistry: "sys:workers:registry",

  // --- Transport Plane (Pub/Sub) ---

  /**
   * Pub/Sub topic for Fan-Out.
   * Format: channel:topic:{conversationId}
   */
  ConversationTopic: (conversationId: string) =>
    `channel:topic:${conversationId}`,

  // --- Sequences (Storage) ---

  /**
   * The atomic sequence counter for a conversation.
   * Format: chat:{conversationId}:seq
   */
  ConversationSequence: (conversationId: string) =>
    `chat:${conversationId}:seq`,

  // --- Whiteboard Worker Coordination ---

  /**
   * Set of board IDs assigned to a specific whiteboard worker.
   * Written by the coordinator's performRebalance() on every rebalance tick.
   * Read by the Whiteboard stream-worker's consumption and recovery loops.
   * Format: sys:worker:{workerId}:boards
   */
  BoardAssignment: (workerId: string) => `sys:worker:${workerId}:boards`,

  /**
   * MD5 hash of the current board assignment for a worker.
   * Used by the coordinator to diff assignments before rewriting (avoids
   * unnecessary SMEMBERS rewrites when nothing changed).
   * Format: sys:worker:{workerId}:boards_hash
   */
  BoardAssignmentHash: (workerId: string) =>
    `sys:worker:${workerId}:boards_hash`,

  /**
   * ZSET tracking alive Whiteboard workers (score = Unix timestamp ms).
   * Written by the Whiteboard worker's heartbeat loop.
   * Pruned by the Whiteboard worker's recovery loop (removes scores older than WORKER_TTL_MS).
   * Format: sys:whiteboard-workers:registry
   */
  WhiteboardWorkerRegistry: "sys:whiteboard-workers:registry",
};
