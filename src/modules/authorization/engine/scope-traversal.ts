import type { PrismaClient } from "@prisma/client";
import type { PermissionScope } from "../types/permission-types";

/**
 * scope-traversal — derives the workspaceId from any PermissionScope.
 *
 * The permission engine always needs a workspaceId for the owner bypass check
 * and workspace-level role resolution. This helper resolves it from whichever
 * scope type is provided, with DB fallback for project/resource scopes.
 */
export async function deriveWorkspaceId(
  scope: PermissionScope,
  db: PrismaClient
): Promise<string> {
  if (scope.type === "workspace") {
    return scope.id;
  }

  if (scope.type === "project") {
    return scope.workspaceId;
  }

  // resource scope — workspaceId is already on the scope object
  return scope.workspaceId;
}

/**
 * deriveScopeId — returns the primary scope identifier for role/permission lookups.
 * For workspace scope → workspaceId
 * For project scope  → projectId
 * For resource scope → projectId (resources are scoped under projects)
 */
export function deriveScopeId(scope: PermissionScope): string {
  if (scope.type === "workspace") return scope.id;
  if (scope.type === "project") return scope.id;
  return scope.projectId;
}

/**
 * deriveScopeType — returns the canonical scope type for cache key building.
 */
export function deriveScopeType(scope: PermissionScope): string {
  if (scope.type === "workspace") return "workspace";
  if (scope.type === "project") return "project";
  return "project"; // resource-scoped permissions use project as the RBAC scope boundary
}
