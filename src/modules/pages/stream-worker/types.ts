/**
 * Stream Worker Types — shared type definitions for the worker loop.
 */

import type { Y } from "@/shared/yjs";
import type { ThresholdRegistry } from "./thresholds/index";

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
  doc: Y.Doc;
  updateCount: number;
  latestStreamId: string;
}

/** Mutable state shared by all 3 worker loops */
export interface WorkerState {
  /** Set to false on SIGTERM — all loops exit cleanly. */
  isRunning: boolean;
  workerIndex: number;
  workerCount: number;
  consumerName: string;
  /** Last seen value of sys:pages:epoch — re-partition when this changes. */
  lastSeenEpoch: string;
  thresholdRegistry: ThresholdRegistry;
  metrics: WorkerMetrics;
}

/** Runtime observability counters */
export interface WorkerMetrics {
  pagesProcessed: number;
  updatesProcessed: number;
  snapshotsCreated: number;
  s3SyncSuccesses: number;
  s3SyncFailures: number;
  redisErrors: number;
  activePagesOwned: number;
  avgProcessingTimeMs: number;
  lastCycleMs: number;
}
