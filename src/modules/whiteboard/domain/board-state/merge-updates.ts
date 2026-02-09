import { Y } from "@/shared/yjs";
import { logger } from "@/shared/logger";

/**
 * Y.Doc Update Merger (V4 Architecture)
 *
 * **CRDT Property:** Applying same update multiple times = idempotent
 * **Use Case:** Incremental Y.Doc merging in stream worker
 */

/**
 * Merge Y.Doc updates into final state
 *
 * **Pattern:** Base snapshot + delta updates → full state
 * **Idempotency:** CRDT guarantees duplicate-safe merging
 *
 * @param baseSnapshot - Base Y.Doc binary from S3 snapshot
 * @param updates - Array of Y.Doc update binaries from Redis stream
 * @returns Final merged Y.Doc state as Uint8Array
 */
export const mergeYDocUpdates = (
  baseSnapshot: Uint8Array,
  updates: Uint8Array[]
): Uint8Array => {
  const ydoc = new Y.Doc();

  try {
    // Apply base snapshot
    Y.applyUpdate(ydoc, baseSnapshot);
  } catch (error) {
    logger.error({ error }, "Invalid base snapshot");
    throw new Error("Failed to apply base snapshot");
  }

  // Apply each delta update sequentially
  for (const update of updates) {
    try {
      Y.applyUpdate(ydoc, update);
    } catch (error) {
      // Log and skip invalid update (CRDT will converge anyway)
      logger.warn(
        { error, updateSize: update.length },
        "Skipping invalid update"
      );
    }
  }

  // Encode final state
  return Y.encodeStateAsUpdate(ydoc);
};

/**
 * Merge multiple updates into a single consolidated update
 *
 * **Why:** Reduce stream entry count before snapshotting
 * **Example:** 50 offline updates → 1 merged update
 */
export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  if (updates.length === 0) {
    throw new Error("Cannot merge empty updates array");
  }

  if (updates.length === 1) {
    return updates[0];
  }

  try {
    return Y.mergeUpdates(updates);
  } catch (error) {
    logger.error(
      { error, updateCount: updates.length },
      "Y.mergeUpdates failed"
    );
    throw new Error("Failed to merge Y.js updates");
  }
}

/**
 * Apply update to Y.Doc (incremental merge)
 *
 * **CRITICAL:** CRDT property ensures idempotency
 * - Applying same update twice = no effect
 * - No deduplication needed at this layer
 */
export function applyUpdateToDoc(ydoc: Y.Doc, update: Uint8Array): void {
  try {
    Y.applyUpdate(ydoc, update);
  } catch (error) {
    logger.error({ error, updateSize: update.length }, "Y.applyUpdate failed");
    throw new Error("Failed to apply Y.js update");
  }
}

/**
 * Create new empty Y.Doc
 *
 * **Use Case:** Cold start when loading from S3
 */
export function createEmptyDoc(): Y.Doc {
  return new Y.Doc();
}

/**
 * Encode Y.Doc as full state snapshot
 *
 * **Use Case:** S3 snapshot creation
 * **Format:** Full CRDT state (not delta)
 */
export function encodeStateAsUpdate(ydoc: Y.Doc): Uint8Array {
  try {
    return Y.encodeStateAsUpdate(ydoc);
  } catch (error) {
    logger.error({ error }, "Y.encodeStateAsUpdate failed");
    throw new Error("Failed to encode Y.Doc state");
  }
}

/**
 * Get estimated memory size of Y.Doc
 *
 * **Use Case:** LRU cache size calculation
 */
export function getDocSize(ydoc: Y.Doc): number {
  const encoded = Y.encodeStateAsUpdate(ydoc);
  return encoded.length;
}
