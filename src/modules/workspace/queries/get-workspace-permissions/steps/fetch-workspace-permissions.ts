/**
 * fetchWorkspacePermissions — step 2
 *
 * Returns permissions belonging to the "workspace" module only.
 * These are the permissions that govern workspace-level RBAC:
 *   workspace:create/read/update/delete/transfer
 *   workspace:member:invite/read/remove/role-update
 *   workspace:invite:view/cancel/resend
 *   workspace:role:create/update/delete/assign-permission
 *   workspace:settings:view
 *
 * Project/issue/page/chat permissions are governed by project roles
 * and are NOT shown here — they have a separate settings surface.
 *
 * Source of truth: server/src/modules/workspace/permissions.ts
 */
import type { PrismaClient } from "@prisma/client";

export async function fetchWorkspacePermissions(db: PrismaClient) {
  return db.permission.findMany({
    where: {
      module: "workspace",
      isDeprecated: false,
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
