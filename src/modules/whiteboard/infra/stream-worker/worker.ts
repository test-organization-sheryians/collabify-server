import { createLogger } from "@/shared/lib/logger";
import type { WorkerState } from "./types";
import { WORKER_GROUP_NAME, CONSUMER_NAME } from "./config";
import { createBoardCache } from "./cache-manager";
import {
  startHeartbeatLoop,
  startConsumptionLoop,
  startRecoveryLoop,
} from "./worker-loops";
import { createSnapshot } from "./snapshot-manager";
import { clearCacheTimer } from "./cache-manager";

const logger = createLogger("whiteboard:infra:stream-worker");

/**
 * Whiteboard Stream Worker
 *
 * Main worker orchestrator and lifecycle management
 */
export const whiteboardStreamWorker = {
  state: null as WorkerState | null,

  async init() {
    // Initialize worker state
    const cacheUpdateTimers = new Map<string, NodeJS.Timeout>();

    this.state = {
      isRunning: true,
      knownGroups: new Set<string>(),
      cacheUpdateTimers,
      boardCache: createBoardCache(cacheUpdateTimers),
    };

    logger.info("Starting Whiteboard Stream Worker (V4)", {
      group: WORKER_GROUP_NAME,
      consumer: CONSUMER_NAME,
    });

    // Start loops
    this.heartbeatLoop();
    this.consumptionLoop();
    this.recoveryLoop();
  },

  heartbeatLoop() {
    if (!this.state) return;
    startHeartbeatLoop(this.state);
  },

  consumptionLoop() {
    if (!this.state) return;
    startConsumptionLoop(this.state);
  },

  recoveryLoop() {
    if (!this.state) return;
    startRecoveryLoop(this.state);
  },

  async shutdown() {
    if (!this.state) return;

    logger.info("Shutting down Whiteboard Stream Worker...");
    this.state.isRunning = false;

    // 1. Snapshot ALL dirty boards (parallel for speed)
    const dirtyBoards = Array.from(this.state.boardCache.entries()).filter(
      ([_, boardState]) => boardState.isDirty
    );

    if (dirtyBoards.length > 0) {
      logger.info("Snapshotting dirty boards before shutdown", {
        count: dirtyBoards.length,
      });

      await Promise.all(
        dirtyBoards.map(([boardId, boardState]) =>
          createSnapshot(boardId, boardState, "shutdown")
        )
      );
    }

    // 2. Destroy ALL Y.Doc instances
    for (const [_, boardState] of this.state.boardCache.entries()) {
      boardState.ydoc.destroy();
    }

    // 3. Clear cache
    this.state.boardCache.clear();

    // 4. Clear all timers
    for (const timer of this.state.cacheUpdateTimers.values()) {
      clearTimeout(timer);
    }
    this.state.cacheUpdateTimers.clear();

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
