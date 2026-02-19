/**
 * Lua Scripts Index — Loader + barrel re-export.
 *
 * USAGE:
 *   // In PagesModule.startEngine():
 *   const luaShas = await loadAllLuaScripts(redis)
 *   // Store luaShas in a module singleton for use by WS handlers and stream worker.
 *
 * WHY PRE-LOAD at startup:
 * Using EVALSHA (run by SHA) instead of EVAL (send script every time) reduces
 * Redis CPU and network bandwidth on the hot path. Scripts must be loaded once
 * before any handler invokes EVALSHA, otherwise Redis returns NOSCRIPT error.
 *
 * IMPORTANT: loadAllLuaScripts() must complete before the WS server starts
 * accepting connections. If handlers run before scripts are loaded, EVALSHA will
 * fail with NOSCRIPT and the handler will throw.
 */

import type { Redis } from "ioredis";
import { PRESENCE_TRACKING_SCRIPT, PAGE_ACTIVATION_SCRIPT } from "./presence";
import { ATOMIC_PAGE_UPDATE_SCRIPT } from "./page-update";
import { UNSUBSCRIBE_CLEANUP_SCRIPT } from "./cleanup";
import { SNAPSHOT_LOCK_RELEASE_SCRIPT } from "./snapshot-lock";

// Re-export all script strings (needed by tests that SCRIPT LOAD manually)
export * from "./presence";
export * from "./page-update";
export * from "./cleanup";
export * from "./snapshot-lock";

// ─── Types ────────────────────────────────────────────────────────────────────

/** SHA1 fingerprints for all Lua scripts, returned by loadAllLuaScripts(). */
export interface LuaShas {
  /** SHA for PRESENCE_TRACKING_SCRIPT */
  presenceSha: string;
  /** SHA for PAGE_ACTIVATION_SCRIPT */
  activationSha: string;
  /** SHA for ATOMIC_PAGE_UPDATE_SCRIPT (hot path) */
  atomicUpdateSha: string;
  /** SHA for UNSUBSCRIBE_CLEANUP_SCRIPT */
  cleanupSha: string;
  /** SHA for SNAPSHOT_LOCK_RELEASE_SCRIPT */
  lockReleaseSha: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Pre-load all Lua scripts into Redis and return their SHAs.
 * Called once per process in PagesModule.startEngine().
 *
 * Uses Promise.all for parallel loading — all 5 scripts are independent.
 *
 * TODO: Implement
 * const [presenceSha, activationSha, atomicUpdateSha, cleanupSha, lockReleaseSha] =
 *   await Promise.all([
 *     redis.script('LOAD', PRESENCE_TRACKING_SCRIPT),
 *     redis.script('LOAD', PAGE_ACTIVATION_SCRIPT),
 *     redis.script('LOAD', ATOMIC_PAGE_UPDATE_SCRIPT),
 *     redis.script('LOAD', UNSUBSCRIBE_CLEANUP_SCRIPT),
 *     redis.script('LOAD', SNAPSHOT_LOCK_RELEASE_SCRIPT),
 *   ])
 * return { presenceSha, activationSha, atomicUpdateSha, cleanupSha, lockReleaseSha }
 */
export const loadAllLuaScripts = async (redis: Redis): Promise<LuaShas> => {
  // TODO: see JSDoc above
  throw new Error("loadAllLuaScripts: not implemented");
};
