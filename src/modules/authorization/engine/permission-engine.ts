import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { PermissionScope } from "../types/permission-types";
import type { AppPermission, PermissionScopeMap } from "../types/app-permissions";
import { AppError } from "@/shared/errors";
import { PermissionResolver } from "./resolver";
import { keys } from "../cache/keys";
import { OWNER_BYPASS_TTL } from "../cache/ttl";
import { PermissionInvalidator } from "../invalidation/permission-invalidator";

/**
 * PermissionEngine — public API for all permission checks.
 *
 * Instantiated once per request via the context factory.
 * Orchestrates: owner bypass → cache → resolver (DB fallback) → cache write.
 *
 * PermissionScope shapes:
 *   { type: "workspace", id: string }
 *   { type: "project", id: string, workspaceId: string }
 *   { type: "resource", id: string, projectId: string, workspaceId: string }
 */
export class PermissionEngine {
  public readonly invalidate: PermissionInvalidator;
  private readonly resolver: PermissionResolver;

  constructor(
    private readonly userId: string,
    private readonly db: PrismaClient,
    private readonly redis: Redis
  ) {
    this.resolver = new PermissionResolver(db, redis);
    this.invalidate = new PermissionInvalidator(redis);
  }

  /**
   * assert — throws AppError.forbidden() if user does not have permission.
   */
  async assert<P extends AppPermission>(
    permission: P,
    scope: PermissionScopeMap[P]
  ): Promise<void> {
    const allowed = await this.can(permission, scope);
    if (!allowed) {
      throw AppError.forbidden(`Permission denied: ${permission}`);
    }
  }

  /**
   * can — returns boolean. Use when you want a soft check without throwing.
   */
  async can<P extends AppPermission>(
    permission: P,
    scope: PermissionScopeMap[P]
  ): Promise<boolean> {
    const lastColonPos = permission.lastIndexOf(":");
    const resource = permission.slice(0, lastColonPos);
    const action = permission.slice(lastColonPos + 1);
    const workspaceId = this.deriveWorkspaceId(scope);

    // 1. Owner bypass — workspace owners skip all checks
    if (workspaceId) {
      const ownerBypass = await this.checkOwnerBypass(workspaceId);
      if (ownerBypass) return true;
    }

    // 2. Resolve via cache → DB (handled inside resolver)
    return this.resolver.resolve({
      userId: this.userId,
      action,
      resource,
      scope,
    });
  }

  /**
   * assertWithContext — for conditional permissions (hasConditions: true).
   * Requires the resource object to evaluate conditions (e.g. createdBy, isLocked).
   */
  async assertWithContext<P extends AppPermission>(
    permission: P,
    scope: PermissionScopeMap[P],
    resourceContext: Record<string, unknown>
  ): Promise<void> {
    const lastColonPos = permission.lastIndexOf(":");
    const resource = permission.slice(0, lastColonPos);
    const action = permission.slice(lastColonPos + 1);
    const workspaceId = this.deriveWorkspaceId(scope);

    if (workspaceId) {
      const ownerBypass = await this.checkOwnerBypass(workspaceId);
      if (ownerBypass) return;
    }

    const allowed = await this.resolver.resolve({
      userId: this.userId,
      action,
      resource,
      scope,
      hasConditions: true,
      resourceContext,
    });

    if (!allowed) {
      throw AppError.forbidden(`Permission denied: ${permission}`);
    }
  }

  /**
   * filter — for list views. Returns only items the user can access.
   * Does not throw — returns empty array if user has no access to any items.
   */
  async filter<T extends { id: string }, P extends AppPermission>(
    items: T[],
    permission: P,
    getScope: (item: T) => PermissionScopeMap[P]
  ): Promise<T[]> {
    const results = await Promise.all(
      items.map(async (item) => {
        const allowed = await this.can(permission, getScope(item));
        return allowed ? item : null;
      })
    );
    return results.filter(
      (item): item is NonNullable<typeof item> => item !== null
    ) as T[];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async checkOwnerBypass(workspaceId: string): Promise<boolean> {
    const cacheKey = keys.ownerBypass(workspaceId, this.userId);
    const cached = await this.redis.get(cacheKey);
    if (cached === "1") return true;
    if (cached === "0") return false;

    // DB check — WorkspaceMember.assignedRole is the FK relation to the roles table
    const member = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: this.userId } },
      select: { assignedRole: { select: { rank: true } } },
    });

    const isOwner = (member?.assignedRole?.rank ?? 0) >= 100;
    await this.redis.set(
      cacheKey,
      isOwner ? "1" : "0",
      "EX",
      OWNER_BYPASS_TTL,
      "NX"
    );
    return isOwner;
  }

  private deriveWorkspaceId(scope: PermissionScope): string | null {
    if (scope.type === "workspace") return scope.id;
    if (scope.type === "project") return scope.workspaceId;
    if (scope.type === "resource") return scope.workspaceId;
    return null;
  }

  /**
   * getAllGrantedPermissions — returns the full list of permission strings
   * the user is allowed at a given scope. Used by getActiveContext query.
   *
   * Cache: `granted-perms:{userId}:{scopeId}` SET, 5-minute TTL.
   * Invalidation: existing PermissionInvalidator.invalidateUser covers this.
   */
  async getAllGrantedPermissions(scope: PermissionScope): Promise<string[]> {
    const scopeId =
      scope.type === "workspace" ? scope.id :
      scope.type === "project"   ? scope.id :
      scope.id;

    const cacheKey = keys.grantedPerms(this.userId, scopeId);
    const cached = await this.redis.smembers(cacheKey);
    if (cached.length > 0) return cached;

    const workspaceId = this.deriveWorkspaceId(scope);
    if (!workspaceId) return [];

    // Owner bypass → grant all permissions
    if (await this.checkOwnerBypass(workspaceId)) {
      const allPerms = await this.db.permission.findMany({
        select: { resource: true, action: true },
      });
      const permStrings = allPerms.map((p) => `${p.resource}:${p.action}`);
      if (permStrings.length > 0) {
        const indexKey = keys.permIndex(this.userId);
        const pipeline = this.redis.pipeline();
        pipeline.sadd(cacheKey, ...permStrings);
        pipeline.expire(cacheKey, 300); // 5 min
        pipeline.sadd(indexKey, cacheKey); // track in perm-index for auto-invalidation
        await pipeline.exec();
      }
      return permStrings;
    }

    // Load workspace role permissions
    const member = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: this.userId } },
      select: {
        assignedRole: {
          select: {
            permissions: {
              where: { effect: "ALLOW" },
              select: { permission: { select: { resource: true, action: true } } },
            },
          },
        },
      },
    });

    let permStrings = (member?.assignedRole?.permissions ?? []).map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`
    );

    // If project scope, also include project role permissions
    if (scope.type === "project") {
      const projectMember = await this.db.projectMember.findUnique({
        where: { projectId_userId: { projectId: scope.id, userId: this.userId } },
        select: {
          projectRole: {
            select: {
              permissions: {
                where: { effect: "ALLOW" },
                select: { permission: { select: { resource: true, action: true } } },
              },
            },
          },
        },
      });
      const projPerms = (projectMember?.projectRole?.permissions ?? []).map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      );
      permStrings = [...new Set([...permStrings, ...projPerms])];
    }

    if (permStrings.length > 0) {
      const indexKey = keys.permIndex(this.userId);
      const pipeline = this.redis.pipeline();
      pipeline.sadd(cacheKey, ...permStrings);
      pipeline.expire(cacheKey, 300); // 5 min
      pipeline.sadd(indexKey, cacheKey); // track in perm-index for auto-invalidation
      await pipeline.exec();
    }

    return permStrings;
  }
}
