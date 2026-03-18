import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { PermissionScope } from "../types/permission-types";
import {
  getPermission,
  setPermission,
  buildScopePermKey,
  buildResourcePermKey,
} from "../cache/permission-cache";
import {
  getRoleAtScope,
  setRoleAtScope,
  getRolePerms,
  setRolePerms,
} from "../cache/role-cache";
import { deriveScopeId, deriveScopeType } from "./scope-traversal";

/**
 * PermissionResolver — multi-step DB resolution pipeline.
 * Called by PermissionEngine ONLY on permission cache miss.
 *
 * Resolution order (mirrors auth-permission-model.md §1):
 *   1. Workspace role → cached RolePermission set
 *   2. Project role   → cached RolePermission set
 *   3. ResourcePolicy for user + resource
 *   4. DENY wins → ALLOW → default DENY
 *   5. Evaluate conditions if hasConditions
 */

export interface ResolveOptions {
  userId: string;
  action: string;
  resource: string;
  scope: PermissionScope;
  hasConditions?: boolean;
  resourceContext?: Record<string, unknown>;
}

export class PermissionResolver {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: Redis
  ) {}

  async resolve(opts: ResolveOptions): Promise<boolean> {
    const { userId, action, resource, scope, hasConditions, resourceContext } =
      opts;
    const scopeId = deriveScopeId(scope);
    const scopeType = deriveScopeType(scope);

    // ── Cache lookup ──────────────────────────────────────────────────────
    if (hasConditions && scope.type === "resource") {
      const key = buildResourcePermKey(userId, resource, action, scope.id);
      const cached = await getPermission(key, this.redis);
      if (cached !== null) return cached === "1";
    } else if (!hasConditions) {
      const key = buildScopePermKey(
        userId,
        resource,
        action,
        scopeType,
        scopeId
      );
      const cached = await getPermission(key, this.redis);
      if (cached !== null) return cached === "1";
    }

    // ── DB Resolution ─────────────────────────────────────────────────────
    const workspaceId =
      scope.type === "workspace"
        ? scope.id
        : scope.type === "project"
          ? scope.workspaceId
          : scope.workspaceId;

    const [wsAllowed] = await Promise.all([
      this.loadRolePermissions(workspaceId, userId, "workspace"),
    ]);

    let projAllowed: string[] = [];
    if (scope.type !== "workspace") {
      projAllowed = await this.loadRolePermissions(scopeId, userId, "project");
    }

    const allAllowed = new Set([...wsAllowed, ...projAllowed]);

    // Load resource-level policies
    let resourceDeny = false;
    let resourceAllow = false;
    if (scope.type === "resource") {
      const policies = await this.db.resourcePolicy.findMany({
        where: { resourceId: scope.id, userId },
        select: {
          effect: true,
          permission: {
            select: { resource: true, action: true },
          },
        },
      });

      for (const policy of policies) {
        const permString = `${policy.permission.resource}:${policy.permission.action}`;
        if (permString !== `${resource}:${action}`) continue;
        if (policy.effect === "DENY") {
          resourceDeny = true;
          break;
        }
        if (policy.effect === "ALLOW") resourceAllow = true;
      }
    }

    // DENY wins
    if (resourceDeny) {
      await this.cacheResult(
        false,
        userId,
        resource,
        action,
        scopeType,
        scopeId,
        scope,
        hasConditions ?? false
      );
      return false;
    }

    const permString = `${resource}:${action}`;
    const baseAllow = allAllowed.has(permString) || resourceAllow;

    if (!baseAllow) {
      await this.cacheResult(
        false,
        userId,
        resource,
        action,
        scopeType,
        scopeId,
        scope,
        hasConditions ?? false
      );
      return false;
    }

    // ── Condition evaluation ──────────────────────────────────────────────
    if (hasConditions && resourceContext) {
      // For now, conditions are evaluated by the caller (assertWithContext)
      // using the resourceContext passed in. Engine cache at resource level.
      if (scope.type === "resource") {
        const key = buildResourcePermKey(userId, resource, action, scope.id);
        await setPermission(key, true, userId, true, this.redis);
      }
      return true;
    }

    await this.cacheResult(
      true,
      userId,
      resource,
      action,
      scopeType,
      scopeId,
      scope,
      hasConditions ?? false
    );
    return true;
  }

  private async loadRolePermissions(
    scopeId: string,
    userId: string,
    scopeType: "workspace" | "project"
  ): Promise<string[]> {
    // 1. Get user's roleId + roleName at scope (cached as "roleId:roleName")
    const cached = await getRoleAtScope(scopeId, userId, this.redis);

    let roleId: string | null = null;
    let roleName: string | null = null;

    if (cached) {
      // Cache format: "<roleId>:<roleName>" (colon separator, roleId is cuid so no colons)
      const colonIdx = cached.indexOf(":");
      if (colonIdx !== -1) {
        roleId = cached.slice(0, colonIdx);
        roleName = cached.slice(colonIdx + 1);
      } else {
        // Legacy cache entry (role name only) — treat as miss to refresh
        roleId = null;
        roleName = null;
      }
    }

    if (!roleId || !roleName) {
      if (scopeType === "workspace") {
        const member = await this.db.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: scopeId, userId } },
          select: {
            roleId: true,
            assignedRole: { select: { name: true } },
          },
        });
        roleName = member?.assignedRole?.name ?? null;
        roleId = member?.roleId ?? null;
      } else {
        const member = await this.db.projectMember.findUnique({
          where: { projectId_userId: { projectId: scopeId, userId } },
          select: {
            projectRoleId: true,
            projectRole: { select: { name: true } },
          },
        });
        roleName = member?.projectRole?.name ?? null;
        roleId = member?.projectRoleId ?? null;
      }

      if (!roleName || !roleId) return [];
      // Store as "roleId:roleName" so both are available on cache hit
      await setRoleAtScope(scopeId, userId, `${roleId}:${roleName}`, this.redis);
    }

    // 2. Get role's permission set — keyed by roleId (workspace-specific, no name collisions)
    let permSet = await getRolePerms(roleId, this.redis);

    if (!permSet) {
      const roleRow = await this.db.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          permissions: {
            select: {
              effect: true,
              permission: {
                select: { resource: true, action: true },
              },
            },
          },
        },
      });

      if (!roleRow) return [];

      const allowed = roleRow.permissions
        .filter((p) => p.effect === "ALLOW")
        .map((p) => `${p.permission.resource}:${p.permission.action}`);
      const denied = roleRow.permissions
        .filter((p) => p.effect === "DENY")
        .map((p) => `${p.permission.resource}:${p.permission.action}`);

      permSet = { allowed, denied };
      await setRolePerms(roleId, permSet, this.redis);
    }

    // Denied in role overrides allowed
    return permSet.allowed.filter((p) => !permSet!.denied.includes(p));
  }

  private async cacheResult(
    result: boolean,
    userId: string,
    resource: string,
    action: string,
    scopeType: string,
    scopeId: string,
    scope: PermissionScope,
    hasConditions: boolean
  ): Promise<void> {
    if (hasConditions && scope.type === "resource") {
      const key = buildResourcePermKey(userId, resource, action, scope.id);
      await setPermission(key, result, userId, true, this.redis);
    } else if (!hasConditions) {
      const key = buildScopePermKey(
        userId,
        resource,
        action,
        scopeType,
        scopeId
      );
      await setPermission(key, result, userId, false, this.redis);
    }
  }
}
