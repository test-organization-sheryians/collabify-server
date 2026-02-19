/**
 * Worker Coordinator — Hash ring partitioning + heartbeat management.
 *
 * Lives at infra/ (not stream-worker/) so future workers (cleanup, analytic jobs, etc.)
 * can share the same partitioning and heartbeat logic without importing from stream-worker.
 *
 * PARTITIONING MODEL:
 * Each worker process is assigned an index (0..WORKER_COUNT-1) via env vars.
 * Pages are deterministically assigned to workers by: crc32(pageId) % WORKER_COUNT.
 * This means each page is always owned by exactly one worker instance.
 * When a worker starts or stops, WORKER_COUNT changes and pages re-partition on the
 * next epoch bump — existing workers detect the epoch change and re-read their assignment.
 *
 * DEPLOYMENT NOTE:
 * WORKER_INDEX and WORKER_COUNT must be set correctly per pod/container.
 * In Kubernetes: use a StatefulSet with pod ordinal index injected via downward API.
 */

import type { Redis } from "ioredis";
import { PageKeys, PageTTLs } from "./page-keys";
import {
  WORKER_INDEX,
  WORKER_COUNT,
  CONSUMER_NAME,
} from "../stream-worker/config";

// ─── Hash Ring ────────────────────────────────────────────────────────────────

/**
 * Determines whether THIS worker instance owns the given pageId.
 *
 * Uses a simple deterministic hash ring:
 *   ownsPage(pageId) = crc32(pageId) % WORKER_COUNT === WORKER_INDEX
 *
 * Alternative (simpler, less uniform distribution):
 *   parseInt(pageId.slice(0, 2), 16) % WORKER_COUNT === WORKER_INDEX
 *
 * TODO: Implement using a crc32 package or the simple hex-prefix approach.
 *
 * IMPORTANT: This function must be PURE and DETERMINISTIC — same input = same output
 * across all worker instances and process restarts. Do not use Math.random() or
 * any non-deterministic input.
 */
export function ownsPage(pageId: string): boolean {
  // TODO: const hash = crc32(pageId) % WORKER_COUNT
  // TODO: return hash === WORKER_INDEX
  throw new Error("ownsPage: not implemented");
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/**
 * Register or refresh this worker's heartbeat in the system-wide ZSET.
 *
 * Called every HEARTBEAT_INTERVAL_MS from startHeartbeatLoop().
 * Workers that stop heartbeating are considered dead and their PEL entries
 * will be claimed by the recovery loop of any surviving worker.
 *
 * TODO: Implement
 * await redis.zadd(PageKeys.SysPageWorkers(), Date.now(), CONSUMER_NAME)
 */
export async function registerHeartbeat(redis: Redis): Promise<void> {
  // TODO: await redis.zadd(PageKeys.SysPageWorkers(), Date.now().toString(), CONSUMER_NAME)
  throw new Error("registerHeartbeat: not implemented");
}

// ─── Active Worker Discovery ─────────────────────────────────────────────────

/**
 * Returns CONSUMER_NAMEs of all workers with a recent heartbeat.
 *
 * Used by the recovery loop to check if a given consumer name belongs to
 * a live worker before claiming its PEL entries.
 *
 * TODO: Implement
 * const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS
 * return redis.zrangebyscore(PageKeys.SysPageWorkers(), cutoff, '+inf')
 */
export async function getActiveWorkers(redis: Redis): Promise<string[]> {
  // TODO: const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS
  // TODO: return redis.zrangebyscore(PageKeys.SysPageWorkers(), cutoff, '+inf')
  throw new Error("getActiveWorkers: not implemented");
}

// ─── Dead Worker Pruning ─────────────────────────────────────────────────────

/**
 * Remove workers that have not heartbeated within WORKER_TTL_MS from the registry.
 *
 * Called at the start of each recovery loop iteration to keep the workers ZSET clean.
 * Returns the count of removed (dead) workers — useful for alerting.
 *
 * TODO: Implement
 * const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS
 * return redis.zremrangebyscore(PageKeys.SysPageWorkers(), '-inf', cutoff)
 */
export async function pruneDeadWorkers(redis: Redis): Promise<number> {
  // TODO: const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS
  // TODO: return redis.zremrangebyscore(PageKeys.SysPageWorkers(), '-inf', cutoff)
  throw new Error("pruneDeadWorkers: not implemented");
}
