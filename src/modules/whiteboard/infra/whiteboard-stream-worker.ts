import { appRedis } from "@/infra/redis";
import { logger } from "@/shared/logger";
import { WhiteboardKeys } from "./whiteboard-keys";
import { s3Client } from "./s3-client-wrapper";
import { Y } from "@/shared/yjs";
import * as os from "os";
import { LRUCache } from "lru-cache";

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
  streamIdWhenLoaded: string;
  isDirty: boolean;
  pendingSnapshot: boolean;
  updatesSinceSnapshot: number;
  lastSnapshotTime: number; // For time-based trigger
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
    sizeCalculation: (state) => {
      return Y.encodeStateAsUpdate(state.ydoc).length;
    },
    dispose: (value, key) => {
      // 1. On eviction: snapshot if dirty (fire-and-forget)
      if (value.isDirty && !value.pendingSnapshot) {
        logger.info(
          { boardId: key },
          "LRU eviction: creating snapshot for dirty board"
        );
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
    logger.info(
      { group: WORKER_GROUP_NAME, consumer: CONSUMER_NAME },
      "Starting Whiteboard Stream Worker (V4)"
    );

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
              logger.info(
                { boardId, idleTimeMs: idleTime },
                "Idle board eviction: no edits for 10min"
              );

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
        logger.error({ err }, "Whiteboard worker heartbeat failed");
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
          logger.error({ err }, "Whiteboard consumption loop error");
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
              logger.info(
                { boardId, count: claimed[1].length },
                "Whiteboard worker: claimed dead updates"
              );

              for (const [id, fields] of claimed[1]) {
                await this.safeProcessUpdate(streamKey, id, fields as string[]);
              }
            }
          } catch (err) {
            logger.error({ err, boardId }, "Recovery claim failed");
          }
        }
      } catch (err) {
        logger.error({ err }, "Whiteboard recovery loop error");
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
        logger.info({ streamKey: key }, "Consumer group created");
      } catch (err: any) {
        if (err?.message?.includes("BUSYGROUP")) {
          this.knownGroups.add(key);
        } else {
          logger.error({ err, streamKey: key }, "Failed to create group");
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
      logger.error(
        { error, streamKey, streamId: id },
        "Y.js update processing failed (will retry via recovery)"
      );
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
      logger.warn({ streamKey, id }, "Missing boardId or update");
      return;
    }

    // 1. Get or load board state
    let state = this.boardCache.get(boardId);
    if (!state) {
      state = await this.coldStart(boardId);
      this.boardCache.set(boardId, state);
      logger.info({ boardId }, "Cold start: loaded board into cache");
    }

    // 2. Apply update (CRDT merge)
    const update = Buffer.from(updateB64, "base64");
    Y.applyUpdate(state.ydoc, update);
    state.lastUpdate = Date.now();
    state.isDirty = true;
    state.updatesSinceSnapshot++;

    // 3. Schedule debounced cache update (5s window)
    this.scheduleCacheUpdate(boardId, state);

    // 4. Check snapshot triggers
    await this.evaluateSnapshotTriggers(boardId, state);

    // 5. Monitor stream health
    await this.monitorStreamHealth(streamKey, boardId);
  },

  /**
   * Cold start: rebuild Y.Doc from S3 + stream delta
   */
  async coldStart(boardId: string): Promise<BoardState> {
    const ydoc = new Y.Doc();
    let streamIdWhenLoaded = "0-0";

    try {
      // Load S3 snapshot
      const snapshot = await s3Client.getLatestSnapshot(boardId);
      if (snapshot) {
        Y.applyUpdate(ydoc, snapshot.data);
        streamIdWhenLoaded = snapshot.streamId || "0-0";
        logger.info(
          { boardId, streamId: streamIdWhenLoaded },
          "Loaded S3 snapshot"
        );
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
        logger.info(
          { boardId, deltaCount: totalReplayed },
          "Applied stream delta (bounded replay)"
        );
      }
    } catch (error) {
      logger.error(
        { error, boardId },
        "Cold start failed, starting with empty doc"
      );
    }

    return {
      ydoc,
      lastUpdate: Date.now(),
      streamIdWhenLoaded,
      isDirty: false,
      pendingSnapshot: false,
      updatesSinceSnapshot: 0,
      lastSnapshotTime: Date.now(), // Initialize for time-based triggers
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

        // Get last stream ID for version tracking
        const streamKey = WhiteboardKeys.BoardStream(boardId);
        const lastEntry = await streamRedis.xrevrange(
          streamKey,
          "+",
          "-",
          "COUNT",
          1
        );
        const streamId = lastEntry[0]?.[0] || state.streamIdWhenLoaded;

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

        this.cacheUpdateTimers.delete(boardId);
        logger.debug({ boardId, streamId }, "Redis cache updated (versioned)");
      } catch (error) {
        logger.error({ error, boardId }, "Cache update failed");
      }
    }, 5000);

    this.cacheUpdateTimers.set(boardId, timer);
  },

  /**
   * Evaluate snapshot triggers (count/time/memory)
   * CRITICAL: All three triggers must be checked to prevent idle boards never snapshotting
   */
  async evaluateSnapshotTriggers(boardId: string, state: BoardState) {
    if (state.pendingSnapshot) return;

    const now = Date.now();
    const timeSinceSnapshot = now - state.lastSnapshotTime;
    const snapshotSize = Y.encodeStateAsUpdate(state.ydoc).length;
    const snapshotSizeMB = snapshotSize / (1024 * 1024);

    // Check all three triggers
    const triggers = {
      count: state.updatesSinceSnapshot >= SNAPSHOT_CONFIG.COUNT_THRESHOLD,
      time: timeSinceSnapshot >= SNAPSHOT_CONFIG.TIME_INTERVAL_MS,
      memory: snapshotSizeMB >= SNAPSHOT_CONFIG.MEMORY_THRESHOLD_MB,
    };

    const shouldSnapshot = triggers.count || triggers.time || triggers.memory;

    if (shouldSnapshot) {
      const reason = triggers.count
        ? "count-threshold"
        : triggers.time
          ? "time-interval"
          : "memory-threshold";
      await this.createSnapshot(boardId, state, reason);
    }
  },

  /**
   * Create S3 snapshot + trim stream
   * CRITICAL: Uses durable Redis lock for exactly-once semantics
   * CRITICAL: Writes are ordered: timestamped → latest → trim for crash safety
   */
  async createSnapshot(boardId: string, state: BoardState, reason: string) {
    const lockKey = WhiteboardKeys.SnapshotLock(boardId);

    // Try acquire lock (60s TTL for crash recovery)
    const acquired = await streamRedis.setnx(lockKey, CONSUMER_NAME);
    if (acquired) {
      await streamRedis.expire(lockKey, 60); // Set TTL after acquisition
    }

    if (!acquired) {
      logger.debug({ boardId }, "Snapshot already in progress");
      return;
    }

    try {
      const snapshot = Y.encodeStateAsUpdate(state.ydoc);
      const timestamp = Date.now();

      // Get last stream ID
      const streamKey = WhiteboardKeys.BoardStream(boardId);
      const lastEntry = await appRedis.xrevrange(
        streamKey,
        "+",
        "-",
        "COUNT",
        1
      );
      const streamId = lastEntry[0]?.[0] || "0-0";

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
        {
          streamId,
          timestamp: new Date(timestamp).toISOString(),
        },
        true
      );

      // Trim stream (MINID - safe trimming)
      await appRedis.xtrim(streamKey, "MINID", streamId);

      logger.info(
        { boardId, streamId, size: snapshot.length, reason },
        "S3 snapshot created + stream trimmed"
      );

      // Update state tracking
      state.isDirty = false;
      state.updatesSinceSnapshot = 0;
      state.lastSnapshotTime = Date.now(); // CRITICAL: Track for time-based triggers

      // Release lock on success
      await streamRedis.del(lockKey);
    } catch (error) {
      logger.error({ error, boardId, reason }, "Snapshot creation failed");
      // Lock auto-expires on crash (60s TTL)

      // Enqueue to DLQ for retry
      await appRedis.xadd(
        "whiteboard:snapshot:dlq",
        "*",
        "boardId",
        boardId,
        "error",
        String(error),
        "timestamp",
        Date.now().toString()
      );
    } finally {
      state.pendingSnapshot = false;
    }
  },

  /**
   * Monitor stream health and apply backpressure if needed
   */
  async monitorStreamHealth(streamKey: string, boardId: string) {
    try {
      const length = await appRedis.xlen(streamKey);

      if (length > HEALTH_THRESHOLDS.DANGER) {
        logger.error({ boardId, length }, "DANGER: Circuit breaker threshold");
        await appRedis.set(
          WhiteboardKeys.BoardCircuitBreaker(boardId),
          "OPEN",
          "EX",
          30
        );
      } else if (length > HEALTH_THRESHOLDS.CRITICAL) {
        logger.warn({ boardId, length }, "CRITICAL: Stream backlog high");
      } else if (length > HEALTH_THRESHOLDS.WARNING) {
        logger.info(
          { boardId, length },
          "WARNING: Stream approaching threshold"
        );
      }
    } catch (error) {
      logger.error({ error, boardId }, "Stream health check failed");
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
      logger.info(
        { count: dirtyBoards.length },
        "Snapshotting dirty boards before shutdown"
      );

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
