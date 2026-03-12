import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

/**
 * role-member-index — maintains role-members:{roleId} Redis Set.
 *
 * Used by PermissionInvalidator.invalidateRole() to enumerate affected
 * users without a DB join when a role's permissions change.
 *
 * Must be called by handlers that assign or remove roles:
 *   assignRole(userId, roleId)   → addRoleMember()
 *   removeRole(userId, roleId)   → removeRoleMember()
 */

export async function addRoleMember(
  roleId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  await redis.sadd(keys.roleMembersIndex(roleId), userId);
}

export async function removeRoleMember(
  roleId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  await redis.srem(keys.roleMembersIndex(roleId), userId);
}

export async function getRoleMembers(
  roleId: string,
  redis: Redis
): Promise<string[]> {
  return redis.smembers(keys.roleMembersIndex(roleId));
}
