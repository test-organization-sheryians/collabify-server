import type { Redis } from "ioredis";
import { keys } from "./keys";
import { ROLE_TTL, ROLEPERMS_TTL } from "./ttl";

/**
 * Role membership and role permission set cache.
 *
 * role:{scopeId}:{userId}   — user's current role name at a scope (5 min TTL)
 * roleperms:{roleId}        — role's full allowed/denied permission set (30 min TTL)
 *
 * Used by engine/resolver.ts to skip repeated DB joins on the same role.
 */

// ── Role at scope ──────────────────────────────────────────────────────────

export async function getRoleAtScope(
  scopeId: string,
  userId: string,
  redis: Redis
): Promise<string | null> {
  return redis.get(keys.roleAtScope(scopeId, userId));
}

export async function setRoleAtScope(
  scopeId: string,
  userId: string,
  role: string,
  redis: Redis
): Promise<void> {
  await redis.set(
    keys.roleAtScope(scopeId, userId),
    role,
    "EX",
    ROLE_TTL,
    "NX"
  );
}

export async function deleteRoleAtScope(
  scopeId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  await redis.del(keys.roleAtScope(scopeId, userId));
}

// ── Role permission set ────────────────────────────────────────────────────

export interface RolePermSet {
  allowed: string[];
  denied: string[];
}

export async function getRolePerms(
  roleId: string,
  redis: Redis
): Promise<RolePermSet | null> {
  const raw = await redis.get(keys.rolePerms(roleId));
  if (!raw) return null;
  return JSON.parse(raw) as RolePermSet;
}

export async function setRolePerms(
  roleId: string,
  perms: RolePermSet,
  redis: Redis
): Promise<void> {
  await redis.set(
    keys.rolePerms(roleId),
    JSON.stringify(perms),
    "EX",
    ROLEPERMS_TTL,
    "NX"
  );
}

export async function deleteRolePerms(
  roleId: string,
  redis: Redis
): Promise<void> {
  await redis.del(keys.rolePerms(roleId));
}
