/**
 * Worker Coordinator — Hash ring partitioning + heartbeat management.
 *
 * Lives at infra/ (not stream-worker/) so future workers (cleanup, analytic jobs, etc.)
 * can share the same partitioning and heartbeat logic without importing from stream-worker.
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
 * djb2 hash — simple, fast, deterministic across all workers and restarts.
 * Must be identical on every worker instance. Do NOT change.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash;
}

/**
 * Returns true if this worker instance owns the given pageId.
 *
 *   owned = Math.abs(djb2(pageId)) % WORKER_COUNT === WORKER_INDEX
 *
 * PURE + DETERMINISTIC — same input always maps to same worker.
 * Scale-out brief overlap is safe: snapshot lock prevents dual writes.
 */
export function ownsPage(pageId: string): boolean {
  return Math.abs(djb2Hash(pageId)) % WORKER_COUNT === WORKER_INDEX;
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/**
 * Register or refresh this worker's heartbeat in the system-wide ZSET.
 * Called every HEARTBEAT_INTERVAL_MS from heartbeatLoop().
 *
 * score = Date.now() (epoch ms)
 * Workers with score < (now - WORKER_TTL_MS) are considered dead.
 */
export async function registerHeartbeat(redis: Redis): Promise<void> {
  await redis.zadd(
    PageKeys.SysPageWorkers(),
    Date.now().toString(),
    CONSUMER_NAME
  );
}

// ─── Active Worker Discovery ──────────────────────────────────────────────────

/**
 * Returns CONSUMER_NAMEs of all workers with a recent heartbeat.
 * Used by recovery loop to skip PEL entries that belong to live workers.
 */
export async function getActiveWorkers(redis: Redis): Promise<string[]> {
  const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS;
  return redis.zrangebyscore(PageKeys.SysPageWorkers(), cutoff, "+inf");
}

// ─── Dead Worker Pruning ──────────────────────────────────────────────────────

/**
 * Remove workers that have not heartbeated within WORKER_TTL_MS.
 * Called at the start of each recoveryLoop iteration.
 * Returns count of pruned (dead) workers.
 */
export async function pruneDeadWorkers(redis: Redis): Promise<number> {
  const cutoff = Date.now() - PageTTLs.WORKER_TTL_MS;
  return redis.zremrangebyscore(PageKeys.SysPageWorkers(), "-inf", cutoff);
}
