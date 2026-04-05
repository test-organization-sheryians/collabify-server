/**
 * remove-member-project-create.ts
 *
 * Removes the project:create permission from all MEMBER workspace roles.
 * After this, only OWNER and ADMIN can create projects.
 *
 * Run: bun run scripts/db/remove-member-project-create.ts
 *   or: bun run db:remove-member-create
 */
import { db } from "../../src/infra/db";
import { appRedis } from "../../src/infra/redis";

async function main() {
  // 1. Find the permission row for project:create
  const permission = await db.permission.findFirst({
    where: { resource: "project", action: "create" },
    select: { id: true, resource: true, action: true },
  });

  if (!permission) {
    console.log("❌ Permission 'project:create' not found in DB");
    return;
  }
  console.log(`✅ Found permission: ${permission.resource}:${permission.action} (id: ${permission.id})\n`);

  // 2. Find all MEMBER system roles across all workspaces
  const memberRoles = await db.role.findMany({
    where: { name: "MEMBER", isSystem: true, scopeType: "WORKSPACE" },
    select: { id: true, name: true, workspaceId: true },
  });

  console.log(`Found ${memberRoles.length} MEMBER role(s) across workspaces\n`);

  let totalDeleted = 0;

  for (const role of memberRoles) {
    const result = await db.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });

    if (result.count > 0) {
      totalDeleted += result.count;
      console.log(`  ✅ Workspace ${role.workspaceId}: removed project:create from MEMBER role (${role.id})`);
    } else {
      console.log(`  ℹ️  Workspace ${role.workspaceId}: project:create was not on MEMBER role — skipped`);
    }
  }

  console.log(`\n✅ Removed ${totalDeleted} RolePermission row(s)\n`);

  // 3. Flush granted-perms Redis cache so the next request re-resolves from DB
  const cacheKeys = await appRedis.keys("granted-perms:*");
  if (cacheKeys.length > 0) {
    await appRedis.del(...cacheKeys);
    console.log(`🗑️  Flushed ${cacheKeys.length} Redis granted-perms cache key(s)`);
  } else {
    console.log("ℹ️  Redis granted-perms cache already empty");
  }

  // Also flush per-permission scope cache keys
  const permKeys = await appRedis.keys(`perm:*:project:create:*`);
  if (permKeys.length > 0) {
    await appRedis.del(...permKeys);
    console.log(`🗑️  Flushed ${permKeys.length} perm cache key(s) for project:create`);
  }

  console.log("\n✅ Done — MEMBER role no longer has project:create\n");
  console.log("   OWNER + ADMIN still retain project:create.\n");
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    appRedis.disconnect();
  });
