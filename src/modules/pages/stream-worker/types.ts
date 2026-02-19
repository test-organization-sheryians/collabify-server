/**
 * Stream Worker Types — shared type definitions for the worker loop.
 */

/** A single raw entry from XREADGROUP (Redis stream entry) */
export interface RawStreamEntry {
  id: string;
  fields: {
    pageId: string;
    update: string; // base64-encoded Yjs binary
    userId: string;
    dedupeId: string;
  };
}

/** Result of applying a batch of updates to a Y.Doc */
export interface PageUpdateResult {
  pageId: string;
  doc: import("yjs").Doc;
  updateCount: number;
  latestStreamId: string;
}

/** Metrics snapshot emitted by the worker for observability */
export interface WorkerMetrics {
  consumerName: string;
  processedTotal: number;
  snapshotsBuilt: number;
  failedEntries: number;
  activePagesOwned: number;
  lastCycleMs: number;
}
