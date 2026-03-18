/**
 * Lua Scripts Index — Loader + barrel re-export.
 *
 * USAGE (in PagesModule.startEngine()):
 *   const luaShas = await loadAllLuaScripts(redis)
 *   // Store in module singleton; WS handlers use EVALSHA via these SHAs.
 *
 * WHY PRE-LOAD:
 * EVALSHA (run by SHA) vs EVAL (send full script) reduces Redis CPU and
 * bandwidth on the hot path. Scripts must be loaded before handlers run,
 * otherwise Redis returns NOSCRIPT and the handler throws.
 */

import type { Redis } from "ioredis";
import { PRESENCE_TRACKING_SCRIPT, PAGE_ACTIVATION_SCRIPT } from "./presence";
import { ATOMIC_PAGE_UPDATE_SCRIPT } from "./page-update";
import { UNSUBSCRIBE_CLEANUP_SCRIPT } from "./cleanup";
import { SNAPSHOT_LOCK_RELEASE_SCRIPT } from "./snapshot-lock";
import { CLIENT_SYNC_SCRIPT } from "./client-sync";

// Re-export all script strings (used by tests that SCRIPT LOAD manually)
export * from "./presence";
export * from "./page-update";
export * from "./cleanup";
export * from "./snapshot-lock";
export * from "./client-sync";

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
  /** SHA for SNAPSHOT_LOCK_RELEASE_SCRIPT (stream worker) */
  lockReleaseSha: string;
  /** SHA for CLIENT_SYNC_SCRIPT (getPageSnapshot bidirectional merge) */
  clientSyncSha: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Pre-load all Lua scripts into Redis and return their SHAs.
 * Called once per process in PagesModule.startEngine().
 * All 6 scripts are loaded in parallel.
 */
export const loadAllLuaScripts = async (redis: Redis): Promise<LuaShas> => {
  const [
    presenceSha,
    activationSha,
    atomicUpdateSha,
    cleanupSha,
    lockReleaseSha,
    clientSyncSha,
  ] = (await Promise.all([
    redis.script("LOAD", PRESENCE_TRACKING_SCRIPT),
    redis.script("LOAD", PAGE_ACTIVATION_SCRIPT),
    redis.script("LOAD", ATOMIC_PAGE_UPDATE_SCRIPT),
    redis.script("LOAD", UNSUBSCRIBE_CLEANUP_SCRIPT),
    redis.script("LOAD", SNAPSHOT_LOCK_RELEASE_SCRIPT),
    redis.script("LOAD", CLIENT_SYNC_SCRIPT),
  ])) as string[];

  return {
    presenceSha,
    activationSha,
    atomicUpdateSha,
    cleanupSha,
    lockReleaseSha,
    clientSyncSha,
  };
};
