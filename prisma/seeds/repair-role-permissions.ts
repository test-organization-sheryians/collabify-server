/**
 * repair-role-permissions.ts
 *
 * Backfills missing RolePermission rows for all existing workspaces.
 *
 * This is needed when:
 *   - A workspace was created before seed-permissions.ts was run
 *   - New permissions were added to insert-workspace.ts GRANTS after workspace creation
 *   - The insert-workspace.ts silently skipped a permission because it wasn't seeded yet
 *
 * Safe to run multiple times — uses createMany with skipDuplicates.
 *
 * Run:
 *   bun run prisma/seeds/repair-role-permissions.ts
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SYSTEM_GRANTS } from "./shared/system-grants";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Canonical source of truth — shared with insert-workspace.ts to guarantee they
// never diverge. Any permission added to system-grants.ts is automatically repaired.
const GRANTS = SYSTEM_GRANTS;

async function repairRolePermissions(): Promise<void> {
  console.log("🔍 Loading all permissions from DB...");
  const allPerms = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
  });
  const permMap = new Map(
    allPerms.map((p) => [`${p.resource}:${p.action}`, p.id])
  );
  console.log(`✅ ${allPerms.length} permissions loaded`);

  console.log("🔍 Loading all workspace system roles...");
  // Only workspace-scoped system roles (not project roles)
  const wsRoles = await db.role.findMany({
    where: { scopeType: "WORKSPACE", isSystem: true },
    select: { id: true, name: true, workspaceId: true },
  });
  console.log(
    `✅ ${wsRoles.length} workspace roles found across all workspaces`
  );

  // Group roles by workspace
  const byWorkspace = new Map<string, typeof wsRoles>();
  for (const role of wsRoles) {
    if (!role.workspaceId) continue;
    const arr = byWorkspace.get(role.workspaceId) ?? [];
    arr.push(role);
    byWorkspace.set(role.workspaceId, arr);
  }

  let totalAdded = 0;
  let workspacesRepaired = 0;

  for (const [workspaceId, roles] of byWorkspace) {
    const roleMap = new Map(roles.map((r) => [r.name, r.id]));
    const rolePermData: {
      roleId: string;
      permissionId: string;
      effect: "ALLOW";
    }[] = [];

    for (const grant of GRANTS) {
      const permId = permMap.get(`${grant.resource}:${grant.action}`);
      if (!permId) {
        // Permission not in DB — run seed-permissions first
        continue;
      }
      for (const roleName of grant.roles) {
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;
        rolePermData.push({ roleId, permissionId: permId, effect: "ALLOW" });
      }
    }

    if (rolePermData.length > 0) {
      const result = await db.rolePermission.createMany({
        data: rolePermData,
        skipDuplicates: true, // idempotent — only inserts missing rows
      });
      if (result.count > 0) {
        totalAdded += result.count;
        workspacesRepaired++;
        console.log(
          `  ✅ Workspace ${workspaceId}: +${result.count} role-permissions backfilled`
        );
      }
    }
  }

  console.log(
    `\n✅ Done — ${totalAdded} rows backfilled across ${workspacesRepaired} workspaces`
  );
  console.log(
    "⚠️  Flush Redis permission cache after running this: redis-cli KEYS 'perm:*' | xargs redis-cli DEL"
  );
}

repairRolePermissions()
  .catch((err) => {
    console.error("❌ Repair failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
