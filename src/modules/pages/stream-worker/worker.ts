/**
 * Stream Worker — Main entry point.
 *
 * Three cooperative async loops run in a single process (Bun supports top-level await):
 * 1. processLoop()   — XREADGROUP + apply updates + snapshot on threshold
 * 2. heartbeatLoop() — ZADD sys:page-workers every HEARTBEAT_INTERVAL_MS
 * 3. recoveryLoop()  — XAUTOCLAIM PEL entries from dead workers every cycle
 *
 * PARTITIONING:
 * Each worker only processes streams for pages it owns (ownsPage(pageId) === true).
 * Pages are re-assigned on each processLoop cycle when the epoch changes.
 *
 * START SEQUENCE:
 * 1. Load all Lua scripts into Redis → get LuaShas
 * 2. Start heartbeatLoop (background, non-blocking)
 * 3. Start recoveryLoop (background, non-blocking)
 * 4. Start processLoop (blocking main loop)
 */

import type { Redis } from "ioredis";
import { loadAllLuaScripts } from "../infra/lua";
import {
  registerHeartbeat,
  ownsPage,
  pruneDeadWorkers,
  getActiveWorkers,
} from "../infra/worker-coordinator";
import {
  applyUpdateBatch,
  rebuildPageSnapshot,
  shouldSnapshot,
} from "./processor";
import { PageKeys } from "../infra/page-keys";
import {
  CONSUMER_NAME,
  WORKER_GROUP_NAME,
  BATCH_SIZE,
  BLOCK_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  PEL_CLAIM_THRESHOLD_MS,
  RECOVERY_BATCH_SIZE,
} from "./config";

/**
 * processLoop — the main XREADGROUP loop.
 *
 * FLOW (each iteration):
 *   1. Read current active pages: ZRANGEBYSCORE sys:pages:active -inf +inf
 *   2. Filter to owned pages (ownsPage)
 *   3. For each owned page: XREADGROUP GROUP page-workers CONSUMERAME COUNT BATCH_SIZE BLOCK TIMEOUT
 *   4. Apply updates via applyUpdateBatch
 *   5. XACK processed entries
 *   6. If shouldSnapshot: rebuildPageSnapshot
 *
 * TODO: Implement
 */
async function processLoop(redis: Redis): Promise<void> {
  // TODO: while (true) { ... }
  throw new Error("processLoop: not implemented");
}

/**
 * heartbeatLoop — periodically updates this worker's heartbeat in the registry.
 *
 * TODO: Implement
 *   setInterval(() => registerHeartbeat(redis), HEARTBEAT_INTERVAL_MS)
 */
async function heartbeatLoop(redis: Redis): Promise<void> {
  // TODO: setInterval(async () => { await registerHeartbeat(redis) }, HEARTBEAT_INTERVAL_MS)
  throw new Error("heartbeatLoop: not implemented");
}

/**
 * recoveryLoop — claims PEL entries from dead workers via XAUTOCLAIM.
 *
 * FLOW:
 *   1. pruneDeadWorkers(redis) — remove stale entries from registry
 *   2. getActiveWorkers(redis) — get current live worker set
 *   3. Get all active pages
 *   4. For each owned page: XAUTOCLAIM PEL entries older than PEL_CLAIM_THRESHOLD_MS
 *      (only entries NOT belonging to a currently active worker)
 *   5. Process claimed entries via applyUpdateBatch
 *
 * TODO: Implement
 */
async function recoveryLoop(redis: Redis): Promise<void> {
  // TODO: while (true) { ... }
  throw new Error("recoveryLoop: not implemented");
}

/**
 * startWorker — initialises and launches all three loops.
 *
 * TODO: Implement
 *   1. const luaShas = await loadAllLuaScripts(redis)
 *   2. heartbeatLoop(redis)   // fire-and-forget
 *   3. recoveryLoop(redis)    // fire-and-forget
 *   4. await processLoop(redis)  // blocking
 */
export async function startWorker(redis: Redis): Promise<void> {
  // TODO: see JSDoc above
  throw new Error("startWorker: not implemented");
}
