/**
 * Stream Worker Processor — applies Yjs update batches to Y.Doc and decides when to snapshot.
 *
 * Called by the main worker loop for each XREADGROUP batch.
 * Separated from worker.ts to make testing easier (no Redis dependency in tests).
 *
 * SNAPSHOT DECISION LOGIC:
 * - After every SNAPSHOT_THRESHOLD processed entries, trigger a snapshot rebuild.
 * - A cooldown prevents thrashing if entries arrive very rapidly.
 * - The snapshot lock prevents two worker instances from rebuilding simultaneously.
 */

import type { RawStreamEntry, PageUpdateResult } from "./types";
import { SNAPSHOT_THRESHOLD, SNAPSHOT_COOLDOWN_MS } from "./config";
import { PageKeys, PageTTLs } from "../infra/page-keys";
import { saveSnapshotToS3 } from "./worker-storage";
import { SNAPSHOT_LOCK_RELEASE_SCRIPT } from "../infra/lua/snapshot-lock";
import { Y } from "@/shared/yjs";

/**
 * Apply a batch of raw stream entries to an existing or new Y.Doc.
 *
 * @param entries   - Raw stream entries from XREADGROUP
 * @param existingDoc - Pass existing Y.Doc to append updates, or undefined for fresh
 * @returns PageUpdateResult with the merged doc and last stream ID
 *
 * TODO: Implement
 *   const doc = existingDoc ?? new Y.Doc({ guid: entries[0].fields.pageId })
 *   let latestStreamId = ''
 *   for (const entry of entries) {
 *     const binary = Buffer.from(entry.fields.update, 'base64')
 *     Y.applyUpdate(doc, binary)
 *     latestStreamId = entry.id
 *   }
 *   return { pageId: entries[0].fields.pageId, doc, updateCount: entries.length, latestStreamId }
 */
export function applyUpdateBatch(
  entries: RawStreamEntry[],
  existingDoc?: Y.Doc
): PageUpdateResult {
  // TODO: see JSDoc above
  throw new Error("applyUpdateBatch: not implemented");
}

/**
 * Persist a Y.Doc snapshot to Redis + S3.
 * Acquires the snapshot lock, builds state, uploads.
 *
 * @param pageId      - Page identifier
 * @param doc         - Y.Doc with all updates applied
 * @param redis       - Redis client
 * @param consumerName - This worker's CONSUMER_NAME (for lock ownership check)
 *
 * FLOW:
 *   1. SET NX snapshot lock (consumerName, EX SNAPSHOT_LOCK_TTL)
 *   2. If lock was not acquired: return (another worker got it first)
 *   3. Y.encodeStateAsUpdate(doc) → Buffer
 *   4. redis.setex(PageKeys.PageSnapshotLatest(pageId), SNAPSHOT_REDIS TTL, state)
 *   5. saveSnapshotToS3(pageId, state) — historical then latest
 *   6. Release lock via SNAPSHOT_LOCK_RELEASE_SCRIPT
 *   7. XTRIM stream to remove fully-snapshotted entries
 *
 * TODO: Implement
 */
export async function rebuildPageSnapshot(
  pageId: string,
  doc: Y.Doc,
  redis: any,
  consumerName: string
): Promise<void> {
  // TODO: see flow in JSDoc above
  throw new Error("rebuildPageSnapshot: not implemented");
}

/**
 * Determines if a snapshot should be triggered based on processed entry count
 * and last snapshot timestamp (cooldown enforcement).
 *
 * TODO: Implement
 * sequenceSinceSnapshot >= SNAPSHOT_THRESHOLD && Date.now() - lastSnapshotAt >= SNAPSHOT_COOLDOWN_MS
 */
export function shouldSnapshot(
  sequenceSinceSnapshot: number,
  lastSnapshotAt: number
): boolean {
  // TODO: return sequenceSinceSnapshot >= SNAPSHOT_THRESHOLD && Date.now() - lastSnapshotAt >= SNAPSHOT_COOLDOWN_MS
  throw new Error("shouldSnapshot: not implemented");
}
