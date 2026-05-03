/**
 * fetchProjectPermissions — step 2
 *
 * Returns all permissions relevant to project-level roles.
 * Excludes workspace-management permissions (module = "workspace") because:
 *   - Workspace permissions (workspace:*, workspace.role:*, workspace.member:*)
 *     belong to workspace system roles, not project roles.
 *   - Showing them in the project role picker is misleading — even if assigned,
 *     they are resolved at workspace scope, not project scope.
 *
 * @returns Permissions grouped-ready (sorted by resource + action for UI grouping)
 */
import type { PrismaClient } from "@prisma/client";
import type { GetAllPermissionsResult } from "../types";

/** Modules whose permissions are NOT relevant to project roles. */
const WORKSPACE_ONLY_MODULES = ["workspace"] as const;

export async function fetchProjectPermissions(
  db: PrismaClient
): Promise<GetAllPermissionsResult> {
  return db.permission.findMany({
    where: {
      module: { notIn: [...WORKSPACE_ONLY_MODULES] },
      isDeprecated: false,
      // project:create is WorkspaceScope-only — governed by workspace roles,
      // not project roles. Exclude it from the project role matrix.
      NOT: { resource: "project", action: "create" },
    },
    select: {
      id: true,
      resource: true,
      action: true,
      description: true,
      module: true,
    },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
}
