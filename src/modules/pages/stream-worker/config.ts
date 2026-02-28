/**
 * Stream Worker Config — all tuneable constants in one place.
 *
 * Rationale for separation: these values differ between environments
 * and may be tuned without touching handler logic.
 *
 * DEPLOYMENT:
 * PAGE_WORKER_INDEX and PAGE_WORKER_COUNT come from environment (StatefulSet pod ordinal).
 * In a single-instance dev setup: INDEX=0, COUNT=1 → worker owns all pages.
 */

import { hostname } from "os";

// ─── Identity ─────────────────────────────────────────────────────────────────

/**
 * WORKER_INDEX: 0-based index of this worker pod.
 * Used for hash ring: pages with crc32(pageId) % WORKER_COUNT === WORKER_INDEX are owned.
 */
export const WORKER_INDEX = parseInt(process.env.PAGE_WORKER_INDEX ?? "0", 10);

/** Total worker instance count currently deployed. */
export const WORKER_COUNT = parseInt(process.env.PAGE_WORKER_COUNT ?? "1", 10);

/**
 * Globally unique consumer name for this process.
 * Format: worker-<hostname>-<pid>
 *
 * WHY HOST + PID: hostname alone is not unique in containerised environments
 * if the pod restarts and gets a new PID but reuses the hostname. hostname + PID
 * ensures uniqueness across restarts, which is required for XAUTOCLAIM safety:
 * we never want to claim our own PEL entries from a crashed previous instance.
 */
export const CONSUMER_NAME = `worker-${hostname()}-${process.pid}`;

/** Redis stream consumer group name. All workers share this group. */
export const WORKER_GROUP_NAME =
  process.env.WORKER_GROUP_NAME ?? "page-workers";

// ─── Batch Processing ─────────────────────────────────────────────────────────

/** How many stream messages to pull per XREADGROUP call. */
export const BATCH_SIZE = 50;

/** Milliseconds to wait for new stream messages (blocking XREADGROUP timeout). */
export const BLOCK_TIMEOUT_MS = 5_000;

/** Maximum Redis stream length per page. Enforced via XADD MAXLEN. */
export const PAGE_MAX_STREAM_LENGTH = 10_000;

// ─── Snapshot ─────────────────────────────────────────────────────────────────

/** Rebuild snapshot after this many stream entries have accumulated since last snapshot. */
export const SNAPSHOT_THRESHOLD = 500;

/** Minimum milliseconds between consecutive snapshot rebuilds (back-off). */
export const SNAPSHOT_COOLDOWN_MS = 60_000;

// ─── Heartbeat & Recovery ─────────────────────────────────────────────────────

/** Heartbeat interval in milliseconds. */
export const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * PEL expiry threshold (ms). Entries older than this are claimed from dead workers.
 * Must be > HEARTBEAT_INTERVAL_MS × 3 to avoid premature claiming during transient pauses.
 */
export const PEL_CLAIM_THRESHOLD_MS = 60_000;

/** How many PEL entries to claim per XAUTOCLAIM call. */
export const RECOVERY_BATCH_SIZE = 100;
