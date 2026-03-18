import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

/**
 * PermissionCacheInvalidator — invalidates PermissionEngine result cache.
 *
 * Uses the secondary index pattern:
 *   perm-index:{userId} → Redis Set of all cached perm keys for that user
 *
 * This avoids keyspace SCAN — invalidation is O(user's permission count).
 */
export class PermissionInvalidator {
  constructor(private readonly redis: Redis) {}

  /**
   * Invalidate all cached permissions for userId scoped to a specific scopeId.
   * Call this on: role change, member role update.
   */
  async invalidateUser(userId: string, scopeId: string): Promise<void> {
    const indexKey = keys.permIndex(userId);
    const allKeys = await this.redis.smembers(indexKey);
    const scopedKeys = allKeys.filter((k) => k.includes(`:${scopeId}`));

    if (scopedKeys.length > 0) {
      const pipeline = this.redis.pipeline();
      scopedKeys.forEach((k) => pipeline.del(k));
      scopedKeys.forEach((k) => pipeline.srem(indexKey, k));
      await pipeline.exec();
    }

    // Also remove cached role-at-scope
    await this.redis.del(keys.roleAtScope(scopeId, userId));
  }

  /**
   * Invalidate ALL cached permissions for a user across all scopes.
   * Call this on: member removal, account deletion.
   */
  async invalidateUserAll(userId: string): Promise<void> {
    const indexKey = keys.permIndex(userId);
    const allKeys = await this.redis.smembers(indexKey);

    if (allKeys.length > 0) {
      const pipeline = this.redis.pipeline();
      allKeys.forEach((k) => pipeline.del(k));
      pipeline.del(indexKey);
      await pipeline.exec();
    }
  }

  /**
   * Invalidate all permissions derived from a specific role.
   * Call this on: updateRolePermission.
   * Reads role-members:{roleId} index — no DB join needed.
   */
  async invalidateRole(roleId: string, memberUserIds: string[]): Promise<void> {
    // Delete the cached role permission set
    await this.redis.del(keys.rolePerms(roleId));

    // Invalidate each affected user in batches of 100
    const chunks = chunkArray(memberUserIds, 100);
    for (const chunk of chunks) {
      await Promise.all(chunk.map((uid) => this.invalidateUserAll(uid)));
    }
  }

  /**
   * Invalidate resource-scoped permission cache for a specific resource.
   * Call this on: page lock/unlock (isLocked condition), resource archive.
   */
  async invalidateResource(
    resource: string,
    resourceId: string,
    affectedUserIds: string[]
  ): Promise<void> {
    if (affectedUserIds.length === 0) return;
    const keysFn = affectedUserIds.map((uid) =>
      keys.permResource(uid, resource, "*", resourceId)
    );

    // These are exact keys (not patterns), so we can DEL directly
    const pipeline = this.redis.pipeline();
    keysFn.forEach((k) => pipeline.del(k));
    await pipeline.exec();
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
