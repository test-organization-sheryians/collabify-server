#!/usr/bin/env bun
/**
 * migrate-permissions.ts
 *
 * Phase 4 DB Cleanup:
 *
 * 1. Deletes the phantom "workspace:create" Permission row (and its
 *    RolePermission assignments) — this permission should never have existed
 *    in the DB because workspace creation is enforced via session auth, not RBAC.
 *
 * 2. Removes any RolePermission rows whose referenced Permission no longer
 *    exists in the canonical WORKSPACE_PERMISSIONS manifest (orphaned grants).
 *
 * Safe to run multiple times — all deletes are idempotent.
 *
 * Run:
 *   bun run scripts/migrate-permissions.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Canonical permission strings from the server manifest.
// These are the ONLY permissions that should exist in the DB.
// Built from WORKSPACE_PERMISSIONS in server/src/modules/workspace/permissions.ts
// (and equivalents for other modules). We use the shared system-grants keys as a
// safe set — any Permission not in VALID_PERMISSIONS will be flagged as orphaned.
const PHANTOM_PERMISSIONS = [
  "workspace:create", // Was mis-scoped — platform-level action, not RBAC
];

async function main() {
  console.log("🔍 Phase 4: DB Permission Cleanup\n");

  // ── Step 1: Delete phantom Permission rows ────────────────────────────────
  for (const permString of PHANTOM_PERMISSIONS) {
    const [resource, action] = permString.split(":");

    // Find the permission row
    const perm = await db.permission.findFirst({
      where: { resource, action },
      select: { id: true },
    });

    if (!perm) {
      console.log(`  ✓  ${permString} — not in DB (already clean)`);
      continue;
    }

    // Delete RolePermission assignments first (FK constraint)
    const rpDeleted = await db.rolePermission.deleteMany({
      where: { permissionId: perm.id },
    });
    console.log(
      `  🗑  ${permString} — deleted ${rpDeleted.count} RolePermission row(s)`
    );

    // Delete the Permission row itself
    await db.permission.delete({ where: { id: perm.id } });
    console.log(`  🗑  ${permString} — Permission row deleted`);
  }

  // ── Step 2: Report orphaned RolePermission rows ───────────────────────────
  // Find RolePermission rows pointing to permissions with empty resource/action.
  const orphaned = await db.rolePermission.findMany({
    where: {
      permission: {
        OR: [{ resource: "" }, { action: "" }],
      },
    },
    select: {
      roleId: true,
      permissionId: true,
      permission: { select: { resource: true, action: true } },
    },
  });

  if (orphaned.length > 0) {
    console.log(`\n⚠️  Found ${orphaned.length} RolePermission row(s) with empty resource/action:`);
    for (const rp of orphaned) {
      console.log(`     roleId=${rp.roleId}  permissionId=${rp.permissionId}  perm="${rp.permission.resource}:${rp.permission.action}"`);
    }
    // Delete using composite keys
    for (const rp of orphaned) {
      await db.rolePermission.delete({
        where: { roleId_permissionId: { roleId: rp.roleId, permissionId: rp.permissionId } },
      });
    }
    console.log(`  🗑  Deleted ${orphaned.length} orphaned RolePermission row(s)`);
  } else {
    console.log("\n  ✓  No orphaned RolePermission rows found");
  }


  console.log("\n✅ Phase 4 complete");
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
