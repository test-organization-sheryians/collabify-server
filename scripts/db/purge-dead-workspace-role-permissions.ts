/**
 * purge-dead-workspace-role-permissions.ts
 *
 * One-time cleanup: removes RolePermission rows assigned to workspace system roles
 * (OWNER/ADMIN/MEMBER/GUEST) for permissions that are no longer in SYSTEM_GRANTS
 * (i.e., project-scoped permissions that should only exist on project roles).
 *
 * Safe to run multiple times — deletes only rows that don't match SYSTEM_GRANTS.
 *
 * Run: bun run scripts/db/purge-dead-workspace-role-permissions.ts
 */
import { db } from "../../src/infra/db";
import { SYSTEM_GRANTS } from "../../prisma/seeds/shared/system-grants";

async function main() {
  // Build the set of valid resource:action combos for workspace roles from SYSTEM_GRANTS
  const validKeys = new Set(SYSTEM_GRANTS.map((g) => `${g.resource}:${g.action}`));
  console.log(`✅ SYSTEM_GRANTS has ${validKeys.size} valid permission keys\n`);

  // Find all workspace system roles
  const wsRoles = await db.role.findMany({
    where: { isSystem: true, scopeType: "WORKSPACE" },
    select: { id: true, name: true, workspaceId: true },
  });
  console.log(`🔍 Found ${wsRoles.length} workspace system roles\n`);

  let totalDeleted = 0;

  for (const role of wsRoles) {
    const rolePems = await db.rolePermission.findMany({
      where: { roleId: role.id },
      include: {
        permission: { select: { id: true, resource: true, action: true } },
      },
    });

    const deadPerms = rolePems.filter(
      (rp) => !validKeys.has(`${rp.permission.resource}:${rp.permission.action}`)
    );

    if (deadPerms.length === 0) continue;

    console.log(`  Role: ${role.name} (${role.workspaceId}) — ${deadPerms.length} dead grants:`);
    for (const rp of deadPerms) {
      console.log(`    🗑️  ${rp.permission.resource}:${rp.permission.action}`);
      await db.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: rp.roleId,
            permissionId: rp.permissionId,
          },
        },
      });
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done — ${totalDeleted} dead RolePermission rows removed from workspace roles`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
