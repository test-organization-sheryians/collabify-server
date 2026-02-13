import type { LRUCache } from "lru-cache";
import type { Y } from "@/shared/yjs";

/**
 * Stream Worker Type Definitions
 */

/**
 * Board state in LRU cache
 */
export interface BoardState {
  ydoc: Y.Doc;
  lastUpdate: number;
  streamIdWhenLoaded: string; // Updated after each processed update
  isDirty: boolean;
  pendingSnapshot: boolean;
  updatesSinceSnapshot: number;
  lastSnapshotTime: number; // For time-based trigger
  approxSize: number; // Approximate size tracking (avoids expensive encode on LRU)
}

/**
 * Worker state container
 */
export interface WorkerState {
  isRunning: boolean;
  knownGroups: Set<string>;
  cacheUpdateTimers: Map<string, NodeJS.Timeout>;
  boardCache: LRUCache<string, BoardState>;
}

/**
 * Snapshot creation reasons
 */
export type SnapshotReason =
  | "count-threshold"
  | "time-threshold"
  | "memory-threshold"
  | "idle-timeout"
  | "lru-eviction"
  | "shutdown";
