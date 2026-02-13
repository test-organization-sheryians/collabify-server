import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:infra:stream-worker");
import { WhiteboardKeys } from "./whiteboard-keys";
import { s3Client } from "./s3-client-wrapper";
import { Y } from "@/shared/yjs";
import * as os from "os";
import { LRUCache } from "lru-cache";
import { LockingService } from "@/services/locking/locking.service";

/**
 * CRITICAL: Use single Redis connection for ALL stream operations
 * to prevent stream corruption, lost ACKs, and read-write split races
 */
const streamRedis = appRedis;

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

const WORKER_GROUP_NAME = "whiteboard-state-consumers:v1";
const CONSUMER_NAME = `worker-${os.hostname()}-${process.pid}`;
const BATCH_COUNT = 100; // Process up to 100 updates per batch
const BLOCK_MS = 2000; // Block for 2s waiting for new stream entries

/**
 * Extract timestamp from Redis stream ID for lag calculation
 * Stream ID format: {milliseconds}-{sequence}
 * Example: "1673456789123-0" → 1673456789123
 */
function extractStreamTimestamp(streamId: string): number {
  const timestamp = streamId.split("-")[0];
  return parseInt(timestamp, 10);
}

/**
 * Board state in LRU cache
 */
interface BoardState {
  ydoc: Y.Doc;
  lastUpdate: number;
  streamIdWhenLoaded: string; // 🔥 FIXED: Now updated after each processed update
  isDirty: boolean;
  pendingSnapshot: boolean;
  updatesSinceSnapshot: number;
  lastSnapshotTime: number; // For time-based trigger
  approxSize: number; // 🔥 NEW: Approximate size tracking (avoids expensive encode on LRU)
}

/**
 * Snapshot trigger configuration
 */
const SNAPSHOT_CONFIG = {
  COUNT_THRESHOLD: 1000, // Snapshot every 1000 updates
  TIME_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MEMORY_THRESHOLD_MB: 10, // 10MB stream memory
};

/**
 * Stream health thresholds
 */
const HEALTH_THRESHOLDS = {
  WARNING: 500,
  ALERT: 1000,
  CRITICAL: 5000,
  DANGER: 10000,
};

export const whiteboardStreamWorker = {
  isRunning: false,
  knownGroups: new Set<string>(),
  cacheUpdateTimers: new Map<string, NodeJS.Timeout>(),

  /**
   * LRU cache for Y.Doc instances
   * **Memory limit:** 2GB (~2000 boards at 1MB each)
   */
  boardCache: new LRUCache<string, BoardState>({
    max: 1000, // Max 1000 boards
    maxSize: 2_000_000_000, // 2GB limit
    // 🔥 PERFORMANCE FIX: Use tracked approxSize instead of expensive encode
    // Old: Y.encodeStateAsUpdate(state.ydoc).length (serializes full doc!)
    // New: Tracked incrementally + corrected on cache/snapshot writes
    sizeCalculation: (state) => {
      return state.approxSize || 10000; // Default 10KB if not yet tracked
    },
    dispose: (value, key) => {
      // 1. On eviction: snapshot if dirty (fire-and-forget)
      if (value.isDirty && !value.pendingSnapshot) {
        logger.info("LRU eviction: creating snapshot for dirty board", {
          boardId: key,
        });
        void whiteboardStreamWorker.createSnapshot(key, value, "lru-eviction");
      }

      // 2. CRITICAL: Destroy Y.Doc to free internal resources
      value.ydoc.destroy();

      // 3. Clear any pending cache update timers
      const timer = whiteboardStreamWorker.cacheUpdateTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        whiteboardStreamWorker.cacheUpdateTimers.delete(key);
      }
    },
  }),

  async init() {
    this.isRunning = true;
    logger.info("Starting Whiteboard Stream Worker (V4)", {
      group: WORKER_GROUP_NAME,
      consumer: CONSUMER_NAME,
    });

    // Start loops
    this.heartbeatLoop();
    this.consumptionLoop();
    this.recoveryLoop();
  },

  /**
   * Heartbeat loop: Register worker liveness + idle board eviction
   */
  async heartbeatLoop() {
    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    let tickCount = 0;

    while (this.isRunning) {
      try {
        await appRedis.zadd("sys:workers:registry", Date.now(), CONSUMER_NAME);

        // Every 12 ticks (60s), check for idle boards
        tickCount++;
        if (tickCount % 12 === 0) {
          const now = Date.now();

          for (const [boardId, state] of this.boardCache.entries()) {
            const idleTime = now - state.lastUpdate;

            if (idleTime > IDLE_TIMEOUT_MS) {
              logger.info("Idle board eviction: no edits for 10min", {
                boardId,
                idleTimeMs: idleTime,
              });

              // 1. Snapshot if dirty
              if (state.isDirty) {
                await this.createSnapshot(boardId, state, "idle-timeout");
              }

              // 2. Destroy Y.Doc
              state.ydoc.destroy();

              // 3. Remove from cache
              this.boardCache.delete(boardId);

              // 4. Clear timers
              const timer = this.cacheUpdateTimers.get(boardId);
              if (timer) {
                clearTimeout(timer);
                this.cacheUpdateTimers.delete(boardId);
              }
            }
          }
        }

        await new Promise((r) => setTimeout(r, 5000));
      } catch (err) {
        logger.error("Whiteboard worker heartbeat failed", { err });
      }
    }
  },

  /**
   * Main consumption loop: XREADGROUP pattern with batching
   * CRITICAL: Batches prevent stream starvation (hot boards dominating reads)
   */
  async consumptionLoop() {
    while (this.isRunning) {
      try {
        // 1. Fetch assigned boards
        const boardIds = await streamRedis.smembers(
          `worker:${CONSUMER_NAME}:boards`
        );

        if (boardIds.length === 0) {
          await new Promise((r) => setTimeout(r, BLOCK_MS));
          continue;
        }

        const MAX_STREAMS_PER_BATCH = 50; // Cap to prevent starvation

        // 2. Process in batches of 50 boards
        for (let i = 0; i < boardIds.length; i += MAX_STREAMS_PER_BATCH) {
          const batch = boardIds.slice(i, i + MAX_STREAMS_PER_BATCH);
          const streamKeys = batch.map((id) => WhiteboardKeys.BoardStream(id));

          // 3. Ensure consumer groups exist
          await this.ensureGroups(streamKeys);

          // 4. XREADGROUP for THIS BATCH ONLY
          const ids = batch.map(() => ">");
          const result = (await streamRedis.xreadgroup(
            "GROUP",
            WORKER_GROUP_NAME,
            CONSUMER_NAME,
            "COUNT",
            BATCH_COUNT, // 100 updates from this batch
            "BLOCK",
            BLOCK_MS,
            "STREAMS",
            ...streamKeys,
            ...ids
          )) as any; // Redis returns complex nested array structure

          // Early break if no updates (optimization)
          if (!result || result.length === 0) {
            break; // No more work in this tick, exit batch loop
          }

          if (result) {
            for (const [streamKey, updates] of result) {
              for (const [id, fields] of updates) {
                await this.safeProcessUpdate(streamKey, id, fields as string[]);
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.message?.includes("NOGROUP")) {
          logger.warn("Whiteboard worker: NOGROUP error, clearing group cache");
          this.knownGroups.clear();
        } else {
          logger.error("Whiteboard consumption loop error", { err });
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  },

  /**
   * Recovery loop: Claim pending updates (dead workers)
   */
  async recoveryLoop() {
    while (this.isRunning) {
      try {
        await new Promise((r) => setTimeout(r, 60000)); // Every 60s

        const boardIds = await streamRedis.smembers(
          `worker:${CONSUMER_NAME}:boards`
        );

        for (const boardId of boardIds) {
          const streamKey = WhiteboardKeys.BoardStream(boardId);

          try {
            // Claim updates pending > 60s
            const claimed = (await appRedis.xautoclaim(
              streamKey,
              WORKER_GROUP_NAME,
              CONSUMER_NAME,
              60000, // 60s
              "0-0",
              "COUNT",
              10
            )) as any;

            if (claimed && claimed[1].length > 0) {
              logger.info("Whiteboard worker: claimed dead updates", {
                boardId,
                count: claimed[1].length,
              });

              for (const [id, fields] of claimed[1]) {
                await this.safeProcessUpdate(streamKey, id, fields as string[]);
              }
            }
          } catch (err) {
            logger.error("Recovery claim failed", { err, boardId });
          }
        }
      } catch (err) {
        logger.error("Whiteboard recovery loop error", { err });
      }
    }
  },

  /**
   * Ensure consumer group exists for stream
   */
  async ensureGroups(streamKeys: string[]) {
    for (const key of streamKeys) {
      if (this.knownGroups.has(key)) continue;

      try {
        await appRedis.xgroup(
          "CREATE",
          key,
          WORKER_GROUP_NAME,
          "0",
          "MKSTREAM"
        );
        this.knownGroups.add(key);
        logger.info("Consumer group created", { streamKey: key });
      } catch (err: any) {
        if (err?.message?.includes("BUSYGROUP")) {
          this.knownGroups.add(key);
        } else {
          logger.error("Failed to create group", { err, streamKey: key });
        }
      }
    }
  },

  /**
   * Safe Y.js update processing with error handling
   */
  async safeProcessUpdate(streamKey: string, id: string, fields: string[]) {
    try {
      await this.processUpdate(streamKey, id, fields);
      await streamRedis.xack(streamKey, WORKER_GROUP_NAME, id);
    } catch (error) {
      logger.error("Y.js update processing failed (will retry via recovery)", {
        error,
        streamKey,
        streamId: id,
      });
    }
  },

  /**
   * Process single Y.js update from stream
   */
  async processUpdate(streamKey: string, id: string, fields: string[]) {
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    const boardId = data.boardId;
    const updateB64 = data.update;

    if (!boardId || !updateB64) {
      logger.warn("Missing boardId or update", { streamKey, id });
      return;
    }

    // 1. Get or load board state
    let state = this.boardCache.get(boardId);
    if (!state) {
      state = await this.coldStart(boardId);
      this.boardCache.set(boardId, state);
      logger.info("Cold start: loaded board into cache", { boardId });
    }

    // 2. Apply update (CRDT merge)
    const update = Buffer.from(updateB64, "base64");
    Y.applyUpdate(state.ydoc, update);
    state.lastUpdate = Date.now();
    state.isDirty = true;
    state.updatesSinceSnapshot++;

    // 🔥 CRITICAL FIX: Update streamIdWhenLoaded after each processed update
    // This ensures cache versioning is accurate
    state.streamIdWhenLoaded = id;

    // 🔥 FIX: Do NOT accumulate approxSize per update (Yjs deltas compress)
    // approxSize is updated only on snapshot encode (debounced every 5s)

    // 3. Schedule debounced cache update (5s window)
    this.scheduleCacheUpdate(boardId, state);

    // 4. Check snapshot triggers
    await this.evaluateSnapshotTriggers(boardId, state);

    // 5. Monitor stream health
    await this.monitorStreamHealth(streamKey, boardId);
  },

  /**
   * Initialize empty board with correct y-excalidraw structure
   *
   * ✅ CRITICAL: y-excalidraw expects root-level Y.Array and Y.Map
   * - ydoc.getArray('elements') → Y.Array<Y.Map<any>>
   * - ydoc.getMap('assets') → Y.Map
   */
  initializeEmptyBoard(): Y.Doc {
    const ydoc = new Y.Doc();

    // Create root-level structures
    ydoc.getArray("elements"); // Y.Array for Excalidraw elements
    ydoc.getMap("assets"); // Y.Map for file assets

    logger.debug("✅ Initialized empty board with Y.Array structure");

    return ydoc;
  },

  /**
   * Cold start: rebuild Y.Doc from S3 + stream delta
   */
  async coldStart(boardId: string): Promise<BoardState> {
    let ydoc: Y.Doc;
    let streamIdWhenLoaded = "0-0";

    try {
      // Load S3 snapshot
      const snapshot = await s3Client.getLatestSnapshot(boardId);
      if (snapshot) {
        // ✅ CRITICAL: Validate snapshot structure
        // Old snapshots have Y.Map for elements (incompatible)
        // New snapshots have Y.Array for elements (correct)
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, snapshot.data);

        const elements = tempDoc.get("elements");

        if (elements instanceof Y.Map) {
          // OLD STRUCTURE - Reject and start fresh
          logger.warn(
            "Old snapshot structure (Y.Map) - starting fresh with Y.Array",
            {
              boardId,
              snapshotSize: snapshot.data.length,
            }
          );

          tempDoc.destroy();
          ydoc = this.initializeEmptyBoard(); // Fresh Y.Doc with correct structure
          streamIdWhenLoaded = "0-0"; // Replay all stream updates
        } else {
          // CORRECT STRUCTURE or empty - use it
          tempDoc.destroy();
          ydoc = new Y.Doc();
          Y.applyUpdate(ydoc, snapshot.data);
          streamIdWhenLoaded = snapshot.streamId || "0-0";

          logger.info("✅ Loaded S3 snapshot with correct structure", {
            boardId,
            streamId: streamIdWhenLoaded,
          });
        }
      } else {
        // No snapshot - create fresh board
        logger.info("📝 No snapshot found - creating fresh board", {
          boardId,
        });
        ydoc = this.initializeEmptyBoard();
      }

      // Apply delta from stream (entries after snapshot)
      // CRITICAL: Bounded replay to prevent OOM and event loop blocking
      const streamKey = WhiteboardKeys.BoardStream(boardId);
      const REPLAY_BATCH_SIZE = 5000;
      let cursor = streamIdWhenLoaded;
      let totalReplayed = 0;

      while (true) {
        const delta = await streamRedis.xrange(
          streamKey,
          `(${cursor}`, // Exclusive start
          "+",
          "COUNT",
          REPLAY_BATCH_SIZE
        );

        if (!delta || delta.length === 0) break;

        for (const [id, fields] of delta) {
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }

          if (data.update) {
            const update = Buffer.from(data.update, "base64");
            Y.applyUpdate(ydoc, update);
          }
          cursor = id; // Track last processed ID for next batch
        }

        totalReplayed += delta.length;

        // Yield between batches to prevent event loop blocking
        if (delta.length === REPLAY_BATCH_SIZE) {
          await new Promise((resolve) => setImmediate(resolve));
        } else {
          break; // Last batch (partial)
        }
      }

      if (totalReplayed > 0) {
        logger.info("Applied stream delta (bounded replay)", {
          boardId,
          deltaCount: totalReplayed,
        });
      }
    } catch (error) {
      logger.error("Cold start failed, starting with empty doc", {
        error,
        boardId,
      });

      // Initialize fresh board if error occurred
      ydoc = this.initializeEmptyBoard();
    }

    return {
      ydoc,
      lastUpdate: Date.now(),
      streamIdWhenLoaded,
      isDirty: false,
      pendingSnapshot: false,
      updatesSinceSnapshot: 0,
      lastSnapshotTime: Date.now(), // Initialize for time-based triggers
      approxSize: Y.encodeStateAsUpdate(ydoc).length, // Initial size
    };
  },

  /**
   * Schedule debounced cache update (5s window)
   */
  scheduleCacheUpdate(boardId: string, state: BoardState) {
    const existing = this.cacheUpdateTimers.get(boardId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const snapshot = Y.encodeStateAsUpdate(state.ydoc);

        // 🔥 CRITICAL FIX: Use tracked streamIdWhenLoaded, NOT xrevrange
        // xrevrange returns latest stream ID (which may not be processed yet)
        // We must use the last APPLIED stream ID from state
        const streamId = state.streamIdWhenLoaded;

        // CRITICAL: Versioned cache for validation
        const versionedCache = {
          binary: Buffer.from(snapshot).toString("base64"),
          streamId,
          updatedAt: Date.now(),
        };

        await streamRedis.set(
          WhiteboardKeys.BoardSnapshot(boardId),
          JSON.stringify(versionedCache),
          "EX",
          7 * 24 * 60 * 60 // 7-day TTL
        );

        // Update accurate size after encode
        state.approxSize = snapshot.length;

        this.cacheUpdateTimers.delete(boardId);
        logger.debug("Redis cache updated (versioned)", { boardId, streamId });
      } catch (error) {
        logger.error("Cache update failed", { error, boardId });
      }
    }, 5000);

    this.cacheUpdateTimers.set(boardId, timer);
  },

  /**
   * Evaluate snapshot triggers (count/time/memory)
   * CRITICAL: All three triggers must be checked to prevent idle boards never snapshotting
   */
  async evaluateSnapshotTriggers(boardId: string, state: BoardState) {
    // CRITICAL: Prevents concurrent snapshots for same board
    if (state.pendingSnapshot) return;

    // Count trigger: Snapshot every N updates
    if (state.updatesSinceSnapshot >= SNAPSHOT_CONFIG.COUNT_THRESHOLD) {
      await this.createSnapshot(boardId, state, "count-threshold");
      return;
    }

    // Time trigger: Snapshot every N minutes
    const timeSinceSnapshot = Date.now() - state.lastSnapshotTime;
    if (timeSinceSnapshot >= SNAPSHOT_CONFIG.TIME_INTERVAL_MS) {
      await this.createSnapshot(boardId, state, "time-threshold");
      return;
    }

    // 🔥 PERFORMANCE FIX: Memory trigger uses approxSize (avoids expensive encode)
    // approxSize is updated on every snapshot/cache encode for accuracy
    const snapshotSizeMB = state.approxSize / (1024 * 1024);
    if (snapshotSizeMB >= SNAPSHOT_CONFIG.MEMORY_THRESHOLD_MB) {
      await this.createSnapshot(boardId, state, "memory-threshold");
      return;
    }
  },

  /**
   * Create S3 snapshot + trim stream
   * CRITICAL: Uses durable Redis lock for exactly-once semantics
   * CRITICAL: Writes are ordered: timestamped → latest → trim for crash safety
   */
  async createSnapshot(boardId: string, state: BoardState, reason: string) {
    // 🔥 CRITICAL FIX #1: Set pendingSnapshot BEFORE lock attempt
    state.pendingSnapshot = true;

    const lockKey = WhiteboardKeys.SnapshotLock(boardId);

    // 🔥 Use centralized LockingService (atomic SET NX EX via Lua)
    const acquired = await LockingService.acquire(lockKey, CONSUMER_NAME, 60);

    if (!acquired) {
      logger.debug("Snapshot already in progress", { boardId });
      // 🔥 CRITICAL FIX #4: Reset pendingSnapshot on lock failure
      state.pendingSnapshot = false;
      return;
    }

    try {
      const snapshot = Y.encodeStateAsUpdate(state.ydoc);
      const timestamp = Date.now();

      // 🔥 CRITICAL FIX #2: Update approxSize on snapshot encode
      state.approxSize = snapshot.length;

      // 🔥 CRITICAL FIX #3: Use applied streamId, NOT xrevrange
      // xrevrange returns stream head (may not be applied yet)
      // We MUST snapshot at the version we actually applied
      const streamKey = WhiteboardKeys.BoardStream(boardId);
      const streamId = state.streamIdWhenLoaded;

      // Write to S3 with metadata
      const s3Key = WhiteboardKeys.S3SnapshotTimestamped(boardId, timestamp);
      await s3Client.putSnapshot(boardId, snapshot, {
        streamId,
        timestamp: new Date(timestamp).toISOString(),
        size: snapshot.length.toString(),
        reason,
      });

      // Update latest pointer
      await s3Client.putSnapshot(
        boardId,
        snapshot,
        { streamId, timestamp: new Date(timestamp).toISOString() },
        true // isLatest flag
      );

      // Update Prisma metadata
      await appRedis.publish(
        "whiteboard:snapshot:created",
        JSON.stringify({ boardId, s3Key, streamId, timestamp })
      );

      // Reset dirty state
      state.isDirty = false;
      state.updatesSinceSnapshot = 0;
      state.lastSnapshotTime = timestamp;
      state.pendingSnapshot = false;

      logger.info("Snapshot created", {
        boardId,
        s3Key,
        streamId,
        sizeKB: Math.round(snapshot.length / 1024),
        reason,
      });

      // Safe trimming: MINID streamId
      // 🔥 Use streamRedis for consistency
      await streamRedis.xtrim(streamKey, "MINID", streamId);
    } catch (error) {
      logger.error("Snapshot creation failed", { error, boardId });

      // DLQ for manual intervention
      await streamRedis.rpush(
        "whiteboard:snapshot:failed",
        JSON.stringify({ boardId, error: String(error), timestamp: Date.now() })
      );

      state.pendingSnapshot = false;
    } finally {
      // 🔥 Always release lock (cleanup)
      await LockingService.release(lockKey, CONSUMER_NAME);
    }
  },

  /**
   * Monitor stream health and apply backpressure if needed
   */
  async monitorStreamHealth(streamKey: string, boardId: string) {
    try {
      const length = await appRedis.xlen(streamKey);

      if (length > HEALTH_THRESHOLDS.DANGER) {
        logger.error("DANGER: Circuit breaker threshold", { boardId, length });
        await appRedis.set(
          WhiteboardKeys.BoardCircuitBreaker(boardId),
          "OPEN",
          "EX",
          30
        );
      } else if (length > HEALTH_THRESHOLDS.CRITICAL) {
        logger.warn("CRITICAL: Stream backlog high", { boardId, length });
      } else if (length > HEALTH_THRESHOLDS.WARNING) {
        logger.info("WARNING: Stream approaching threshold", {
          boardId,
          length,
        });
      }
    } catch (error) {
      logger.error("Stream health check failed", { error, boardId });
    }
  },

  /**
   * Graceful shutdown: snapshot dirty boards, destroy all Y.Docs
   */
  async shutdown() {
    logger.info("Shutting down Whiteboard Stream Worker...");
    this.isRunning = false;

    // 1. Snapshot ALL dirty boards (parallel for speed)
    const dirtyBoards = Array.from(this.boardCache.entries()).filter(
      ([_, state]) => state.isDirty
    );

    if (dirtyBoards.length > 0) {
      logger.info("Snapshotting dirty boards before shutdown", {
        count: dirtyBoards.length,
      });

      await Promise.all(
        dirtyBoards.map(([boardId, state]) =>
          this.createSnapshot(boardId, state, "shutdown")
        )
      );
    }

    // 2. Destroy ALL Y.Doc instances
    for (const [_, state] of this.boardCache.entries()) {
      state.ydoc.destroy();
    }

    // 3. Clear cache
    this.boardCache.clear();

    // 4. Clear all timers
    for (const timer of this.cacheUpdateTimers.values()) {
      clearTimeout(timer);
    }
    this.cacheUpdateTimers.clear();

    logger.info("Whiteboard Stream Worker shutdown complete");
  },
};

/**
 * Start whiteboard stream worker
 */
export const startWhiteboardStreamWorker = async () => {
  await whiteboardStreamWorker.init();
};

/**
 * Wire up graceful shutdown handlers
 */
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, initiating graceful shutdown");
  void whiteboardStreamWorker.shutdown();
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, initiating graceful shutdown");
  void whiteboardStreamWorker.shutdown();
});
