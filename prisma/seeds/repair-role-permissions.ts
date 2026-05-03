/**
 * repair-role-permissions.ts
 *
 * Backfills missing RolePermission rows for all existing workspaces AND projects.
 *
 * This is needed when:
 *   - A workspace/project was created before seed-permissions.ts was run
 *   - New permissions were added to insert-workspace.ts / insert-project.ts GRANTS after creation
 *   - The seed steps silently skipped a permission because the permission row wasn't in DB
 *
 * Safe to run multiple times — uses createMany with skipDuplicates.
 *
 * Run:
 *   bun run prisma/seeds/repair-role-permissions.ts
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SYSTEM_GRANTS, PROJECT_GRANTS } from "./shared/system-grants";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function repairRolePermissions(): Promise<void> {
  console.log("🔍 Loading all permissions from DB...");
  const allPerms = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
  });
  const permMap = new Map(
    allPerms.map((p) => [`${p.resource}:${p.action}`, p.id])
  );
  console.log(`✅ ${allPerms.length} permissions loaded`);

  // ── Part 1: Repair workspace-scoped roles (SYSTEM_GRANTS) ─────────────────
  console.log("\n🔧 Part 1: Repairing workspace-scoped roles...");
  const wsRoles = await db.role.findMany({
    where: { scopeType: "WORKSPACE", isSystem: true },
    select: { id: true, name: true, workspaceId: true },
  });
  console.log(`  Found ${wsRoles.length} workspace roles`);

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
    const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];

    for (const grant of SYSTEM_GRANTS) {
      const permId = permMap.get(`${grant.resource}:${grant.action}`);
      if (!permId) continue; // permission not seeded yet
      for (const roleName of grant.roles) {
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;
        rolePermData.push({ roleId, permissionId: permId, effect: "ALLOW" });
      }
    }

    if (rolePermData.length > 0) {
      const result = await db.rolePermission.createMany({
        data: rolePermData,
        skipDuplicates: true,
      });
      if (result.count > 0) {
        totalAdded += result.count;
        workspacesRepaired++;
        console.log(`  ✅ Workspace ${workspaceId}: +${result.count} rows`);
      }
    }
  }

  // ── Part 2: Repair project-scoped roles (PROJECT_GRANTS) ───────────────────
  console.log("\n🔧 Part 2: Repairing project-scoped roles...");
  const projRoles = await db.role.findMany({
    where: { scopeType: "PROJECT", projectId: { not: null } },
    select: { id: true, name: true, workspaceId: true, projectId: true },
  });
  console.log(`  Found ${projRoles.length} project roles`);

  let projectsRepaired = 0;

  for (const role of projRoles) {
    if (!role.projectId) continue;
    const grantPerms = PROJECT_GRANTS.filter((g) => g.roles.includes(role.name as any));
    if (grantPerms.length === 0) continue;

    const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];
    for (const grant of grantPerms) {
      const permId = permMap.get(`${grant.resource}:${grant.action}`);
      if (!permId) continue;
      rolePermData.push({ roleId: role.id, permissionId: permId, effect: "ALLOW" });
    }

    if (rolePermData.length > 0) {
      const result = await db.rolePermission.createMany({
        data: rolePermData,
        skipDuplicates: true,
      });
      if (result.count > 0) {
        totalAdded += result.count;
        projectsRepaired++;
        console.log(`  ✅ Project role ${role.name} (${role.projectId}): +${result.count} rows`);
      }
    }
  }

  const totalRepaired = workspacesRepaired + projectsRepaired;
  console.log(
    `\n✅ Done — ${totalAdded} rows backfilled across ${totalRepaired} scopes ` +
    `(${workspacesRepaired} workspaces, ${projectsRepaired} project roles)`
  );
  console.log(
    "⚠️  Flush Redis: redis-cli KEYS 'perm:*' 'roleperms:*' 'role:*' 'perm-index:*' | xargs redis-cli DEL"
  );
}

repairRolePermissions()
  .catch((err) => {
    console.error("❌ Repair failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
