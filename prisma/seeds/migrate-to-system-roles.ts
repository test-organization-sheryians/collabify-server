/**
 * migrate-to-system-roles.ts
 *
 * Option A: Reassign all workspace_members currently pointing to workspace-scoped roles
 * to the matching system role (same name, workspaceId = null), then delete the
 * workspace-scoped role rows.
 *
 * Safe to run multiple times (idempotent).
 *
 * Run: bun run prisma/seeds/migrate-to-system-roles.ts
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  // 1. Load all system roles (workspaceId = null) into a name → id map
  const systemRoles = await db.role.findMany({
    where: { workspaceId: null, isSystem: true },
    select: { id: true, name: true, rank: true },
  });

  const systemRoleMap = new Map(systemRoles.map((r) => [r.name, r.id]));
  console.log(
    `✅ System roles loaded: ${[...systemRoleMap.keys()].join(", ")}`
  );

  // 2. Load all workspace-scoped roles
  const wsRoles = await db.role.findMany({
    where: { workspaceId: { not: null } },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      workspaceMembers: { select: { id: true, userId: true } },
    },
  });

  console.log(`\n📋 Found ${wsRoles.length} workspace-scoped roles`);

  let reassigned = 0;
  let skipped = 0;
  const toDelete: string[] = [];

  for (const wsRole of wsRoles) {
    toDelete.push(wsRole.id);

    const systemRoleId = systemRoleMap.get(wsRole.name);
    if (!systemRoleId) {
      console.warn(
        `  ⚠️  No system role found for name "${wsRole.name}" — skipping member reassignment`
      );
      skipped++;
      continue;
    }

    if (wsRole.workspaceMembers.length === 0) {
      console.log(
        `  🗑  ${wsRole.name} (ws=${wsRole.workspaceId?.slice(0, 8)}) — 0 members, will delete`
      );
      continue;
    }

    // Reassign every member from this workspace-scoped role → matching system role
    for (const member of wsRole.workspaceMembers) {
      await db.workspaceMember.update({
        where: { id: member.id },
        data: { roleId: systemRoleId },
      });
      console.log(
        `  ✅ Reassigned member ${member.userId.slice(0, 8)} from ws-role "${wsRole.name}" → system role "${wsRole.name}"`
      );
      reassigned++;
    }
  }

  // 3. Delete all workspace-scoped roles (cascade removes any role_permissions too)
  if (toDelete.length > 0) {
    const deleted = await db.role.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`\n🗑  Deleted ${deleted.count} workspace-scoped role rows`);
  }

  console.log(`\n✅ Migration complete`);
  console.log(`   Members reassigned : ${reassigned}`);
  console.log(`   Roles skipped      : ${skipped}`);
  console.log(`   Roles deleted      : ${toDelete.length}`);
}

main()
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
