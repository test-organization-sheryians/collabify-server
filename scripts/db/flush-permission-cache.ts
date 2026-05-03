#!/usr/bin/env bun
/**
 * flush-permission-cache.ts
 *
 * Flushes ALL authorization-related keys from Redis without touching
 * unrelated application data (sessions, queues, etc.).
 *
 * Uses SCAN + DEL pattern — safe to run against a live instance because
 * it never calls FLUSHALL/FLUSHDB.
 *
 * Key namespaces cleared (from server/src/modules/authorization/cache/keys.ts):
 *   auth:ws:*          — workspace member + meta cache
 *   auth:proj:*        — project member + meta cache
 *   auth:page:*        — page collaborator + state cache
 *   auth:board:*       — whiteboard collaborator + state cache
 *   auth:channel:*     — chat channel member + state cache
 *   auth:user:*        — user profile cache
 *   perm:*             — per-user/per-scope unconditional & conditional permission cache
 *   perm-index:*       — per-user secondary index of cached perm keys
 *   owner:*            — owner-bypass cache
 *   role:*             — user's role-at-scope cache
 *   roleperms:*        — role full permission set cache
 *   role-members:*     — role→members index for bulk invalidation
 *   granted-perms:*    — granted permission sets for activeContext
 *
 * Run:
 *   bun run scripts/flush-permission-cache.ts
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const AUTH_KEY_PATTERNS = [
  "auth:ws:*",
  "auth:proj:*",
  "auth:page:*",
  "auth:board:*",
  "auth:channel:*",
  "auth:user:*",
  "perm:*",
  "perm-index:*",
  "owner:*",
  "role:*",
  "roleperms:*",
  "role-members:*",
  "granted-perms:*",
];

async function scanAndDelete(redis: Redis, pattern: string): Promise<number> {
  let cursor = "0";
  let deleted = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = next;
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");

  return deleted;
}

async function main() {
  const redis = new Redis(REDIS_URL, { lazyConnect: true });

  try {
    await redis.connect();
    console.log(`✅ Connected to Redis at ${REDIS_URL}`);

    let totalDeleted = 0;

    for (const pattern of AUTH_KEY_PATTERNS) {
      const count = await scanAndDelete(redis, pattern);
      if (count > 0) {
        console.log(`  🗑  ${pattern.padEnd(22)} → ${count} key(s) deleted`);
      } else {
        console.log(`  ✓  ${pattern.padEnd(22)} → (nothing cached)`);
      }
      totalDeleted += count;
    }

    console.log(`\n✅ Done. Total keys flushed: ${totalDeleted}`);
  } catch (err) {
    console.error("❌ Flush failed:", err);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

main();
