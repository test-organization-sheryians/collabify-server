import { appRedis as streamRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { WhiteboardKeys } from "../whiteboard-keys";
import { s3Client } from "../s3-client";
import type { BoardState } from "./types";
import { REPLAY_BATCH_SIZE } from "./config";

const logger = createLogger("whiteboard:stream-worker:board-init");

/**
 * Board Initialization Module
 *
 * Handles cold start and board initialization with correct Y.Array structure
 */

/**
 * Initialize empty board with correct y-excalidraw structure
 *
 * ✅ CRITICAL: y-excalidraw expects root-level Y.Array and Y.Map
 * - ydoc.getArray('elements') → Y.Array<Y.Map<any>>
 * - ydoc.getMap('assets') → Y.Map
 */
export function initializeEmptyBoard(): Y.Doc {
  const ydoc = new Y.Doc();

  // Create root-level structures
  ydoc.getArray("elements"); // Y.Array for Excalidraw elements
  ydoc.getMap("assets"); // Y.Map for file assets

  logger.debug("✅ Initialized empty board with Y.Array structure");

  return ydoc;
}

/**
 * Cold start: rebuild Y.Doc from S3 + stream delta
 */
export async function coldStart(boardId: string): Promise<BoardState> {
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
        ydoc = initializeEmptyBoard(); // Fresh Y.Doc with correct structure
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
      ydoc = initializeEmptyBoard();
    }

    // Apply delta from stream (entries after snapshot)
    // CRITICAL: Bounded replay to prevent OOM and event loop blocking
    const streamKey = WhiteboardKeys.BoardStream(boardId);
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
    ydoc = initializeEmptyBoard();
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
}
