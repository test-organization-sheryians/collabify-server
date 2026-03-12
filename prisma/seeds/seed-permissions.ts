/**
 * seed-permissions.ts
 *
 * Idempotently seeds all Permission rows from every module's permissions.ts manifest.
 * Safe to run multiple times — uses upsert on the unique (resource, action) constraint.
 *
 * Run: bun run prisma/seeds/seed-permissions.ts
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { ISSUE_PERMISSIONS } from "../../src/modules/issues/permissions";
import { WORKSPACE_PERMISSIONS } from "../../src/modules/workspace/permissions";
import { PROJECT_PERMISSIONS } from "../../src/modules/project/permissions";
import { PAGE_PERMISSIONS } from "../../src/modules/pages/permissions";
import { BOARD_PERMISSIONS } from "../../src/modules/whiteboard/permissions";
import { CHAT_PERMISSIONS } from "../../src/modules/chat/permissions";
import { VAULT_PERMISSIONS } from "../../src/modules/vault/permissions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const ALL_PERMISSIONS = [
  ...ISSUE_PERMISSIONS,
  ...WORKSPACE_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...PAGE_PERMISSIONS,
  ...BOARD_PERMISSIONS,
  ...CHAT_PERMISSIONS,
  ...VAULT_PERMISSIONS,
];

async function seedPermissions(): Promise<void> {
  console.log(`⚡ Seeding ${ALL_PERMISSIONS.length} permissions...`);

  let created = 0;
  let skipped = 0;

  for (const perm of ALL_PERMISSIONS) {
    const result = await db.permission.upsert({
      where: {
        resource_action: { resource: perm.resource, action: perm.action },
      },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        module: perm.module,
        hasConditions: perm.hasConditions,
      },
      update: {
        description: perm.description,
        module: perm.module,
        hasConditions: perm.hasConditions,
      },
    });

    if (result) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Permissions: ${created} upserted, ${skipped} unchanged`);
}

seedPermissions()
  .catch((err) => {
    console.error("❌ Permission seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
