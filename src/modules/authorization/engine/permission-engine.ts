import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { PermissionScope } from "../types/permission-types";
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
  async assert(
    permission: `${string}:${string}`,
    scope: PermissionScope
  ): Promise<void> {
    const allowed = await this.can(permission, scope);
    if (!allowed) {
      throw AppError.forbidden(`Permission denied: ${permission}`);
    }
  }

  /**
   * can — returns boolean. Use when you want a soft check without throwing.
   */
  async can(
    permission: `${string}:${string}`,
    scope: PermissionScope
  ): Promise<boolean> {
    const [resource, action] = permission.split(":") as [string, string];
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
  async assertWithContext(
    permission: `${string}:${string}`,
    scope: PermissionScope,
    resourceContext: Record<string, unknown>
  ): Promise<void> {
    const [resource, action] = permission.split(":") as [string, string];
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
  async filter<T extends { id: string }>(
    items: T[],
    permission: `${string}:${string}`,
    getScope: (item: T) => PermissionScope
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

    // DB check — WorkspaceMember uses 'assignedRole' relation
    const member = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: this.userId } },
      select: { assignedRole: { select: { rank: true } } },
    });

    const isOwner = (member?.assignedRole.rank ?? 0) >= 100;
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
}
