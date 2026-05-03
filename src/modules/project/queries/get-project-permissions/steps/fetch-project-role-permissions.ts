/**
 * fetchProjectRolePermissions — step 2
 *
 * Returns ALL permissions that are meaningful to grant on a project role.
 * Source of truth: PermissionScopeMap in app-permissions.ts.
 *
 * Include rule: permissions whose scope includes ProjectScope.
 * This means every module EXCEPT "workspace" (WorkspaceScope-only).
 * Additionally excludes project:create which is WorkspaceScope-only despite
 * being in the "project" module.
 *
 * Result covers: issues, pages, whiteboard, chat, vault, project (core/member/role/settings)
 *
 * @returns Permissions sorted by resource + action for UI grouping
 */
import type { PrismaClient } from "@prisma/client";
import type { GetAllPermissionsResult } from "../../get-all-permissions/types";

/** Modules whose permissions are exclusively WorkspaceScope — never valid on a project role. */
const WORKSPACE_ONLY_MODULES = ["workspace"] as const;

export async function fetchProjectRolePermissions(
  db: PrismaClient
): Promise<GetAllPermissionsResult> {
  return db.permission.findMany({
    where: {
      module: { notIn: [...WORKSPACE_ONLY_MODULES] },
      isDeprecated: false,
      // project:create is WorkspaceScope-only despite living in the "project" module.
      // It is governed by workspace system grants, not project roles.
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
