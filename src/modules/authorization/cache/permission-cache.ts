import type { Redis } from "ioredis";
import { keys } from "./keys";
import { PERM_SCOPE_TTL, PERM_RESOURCE_TTL } from "./ttl";

/**
 * Permission result cache R/W for the PermissionEngine.
 *
 * CRITICAL: Every SET must atomically SADD the key into the per-user secondary
 * index (`perm-index:{userId}`) so invalidation can DEL all user keys in O(P)
 * with a pipeline — without keyspace SCAN.
 *
 * Uses SET NX EX (first writer wins) to handle concurrent cache misses safely.
 */

export async function getPermission(
  cacheKey: string,
  redis: Redis
): Promise<"1" | "0" | null> {
  const val = await redis.get(cacheKey);
  if (val === "1" || val === "0") return val;
  return null;
}

/**
 * Write a permission result and register it in the user's secondary index.
 * Unconditional (scope-level) permissions use PERM_SCOPE_TTL (5 min).
 * Conditional (resource-level) permissions use PERM_RESOURCE_TTL (2 min).
 */
export async function setPermission(
  cacheKey: string,
  value: boolean,
  userId: string,
  isResourceScoped: boolean,
  redis: Redis
): Promise<void> {
  const ttl = isResourceScoped ? PERM_RESOURCE_TTL : PERM_SCOPE_TTL;
  const indexKey = keys.permIndex(userId);

  // Atomic pipeline: cache write + secondary index registration
  const pipeline = redis.pipeline();
  pipeline.set(cacheKey, value ? "1" : "0", "EX", ttl, "NX");
  pipeline.sadd(indexKey, cacheKey);
  await pipeline.exec();
}

/**
 * Build a scope-level (unconditional) permission cache key.
 */
export function buildScopePermKey(
  userId: string,
  resource: string,
  action: string,
  scopeType: string,
  scopeId: string
): string {
  return keys.permScope(userId, resource, action, scopeType, scopeId);
}

/**
 * Build a resource-level (conditional) permission cache key.
 */
export function buildResourcePermKey(
  userId: string,
  resource: string,
  action: string,
  resourceId: string
): string {
  return keys.permResource(userId, resource, action, resourceId);
}
