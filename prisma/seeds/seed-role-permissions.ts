// @ts-nocheck
// DEPRECATED — this script pre-dates the workspace-first role seeding model.
// System roles (OWNER/ADMIN/MEMBER/GUEST + MANAGER/CONTRIBUTOR/VIEWER) are now
// seeded per-workspace inside insert-workspace.ts. This script attempted to
// create global system roles with workspaceId=null which is no longer allowed.
// Kept for historical reference only. DO NOT RUN on the current schema.
/**
 * seed-role-permissions.ts
 *
 * Idempotently assigns permissions to system roles.
 *
 * System roles (workspaceId = null, isSystem = true) are seeded separately
 * and represent the global templates. Each workspace starts with these roles
 * as templates and can customize with workspace-scoped roles.
 *
 * Rank mapping:
 *   100 = OWNER   (full control)
 *   90  = ADMIN   (all except billing/transfer)
 *   70  = MANAGER (project-level control)
 *   50  = MEMBER  (standard contributor)
 *   30  = VIEWER  (read-only)
 *   10  = GUEST   (minimal access)
 *
 * Run: bun run prisma/seeds/seed-role-permissions.ts
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ── Role definitions ─────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  {
    name: "OWNER",
    rank: 100,
    scopeType: "WORKSPACE" as const,
    description: "Full workspace control",
  },
  {
    name: "ADMIN",
    rank: 90,
    scopeType: "WORKSPACE" as const,
    description: "Administrative access",
  },
  {
    name: "MANAGER",
    rank: 70,
    scopeType: "WORKSPACE" as const,
    description: "Project management access",
  },
  {
    name: "MEMBER",
    rank: 50,
    scopeType: "WORKSPACE" as const,
    description: "Standard contributor access",
  },
  {
    name: "VIEWER",
    rank: 30,
    scopeType: "WORKSPACE" as const,
    description: "Read-only access",
  },
  {
    name: "GUEST",
    rank: 10,
    scopeType: "WORKSPACE" as const,
    description: "Minimal guest access",
  },
];

// ── Permission grant table ───────────────────────────────────────────────────
// Format: [resource, action]
// Each row is ALLOWED for the roles listed in the `roles` array.

const GRANTS: Array<{
  resource: string;
  action: string;
  roles: string[];
  conditions?: Prisma.InputJsonValue;
}> = [
  // ── Workspace permissions ─────────────────────────────────────────────────
  {
    resource: "workspace",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "workspace",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
  },
  { resource: "workspace", action: "update", roles: ["OWNER", "ADMIN"] },
  { resource: "workspace", action: "delete", roles: ["OWNER"] },
  { resource: "workspace", action: "transfer", roles: ["OWNER"] },
  {
    resource: "workspace.member",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  { resource: "workspace.member", action: "invite", roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member", action: "remove", roles: ["OWNER", "ADMIN"] },
  {
    resource: "workspace.member",
    action: "role-update",
    roles: ["OWNER", "ADMIN"],
  },

  // ── Project permissions ───────────────────────────────────────────────────
  {
    resource: "project",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "project",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
  },
  {
    resource: "project",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  { resource: "project", action: "delete", roles: ["OWNER", "ADMIN"] },
  {
    resource: "project",
    action: "archive",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "project.member",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "project.member",
    action: "add",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "project.member",
    action: "remove",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "project.member",
    action: "role-update",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Issue permissions ─────────────────────────────────────────────────────
  {
    resource: "issue",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "issue",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
  },
  {
    resource: "issue",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "issue",
    action: "delete",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },

  // ── Issue status permissions ──────────────────────────────────────────────
  {
    resource: "issue.status",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "issue.status",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
  },
  {
    resource: "issue.status",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "issue.status",
    action: "delete",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Issue label permissions ───────────────────────────────────────────────
  {
    resource: "issue.label",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "issue.label",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
  },
  {
    resource: "issue.label",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "issue.label",
    action: "delete",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Page permissions ──────────────────────────────────────────────────────
  {
    resource: "page",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "page",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "page",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  { resource: "page", action: "delete", roles: ["OWNER", "ADMIN", "MANAGER"] },
  { resource: "page", action: "archive", roles: ["OWNER", "ADMIN", "MANAGER"] },
  { resource: "page", action: "lock", roles: ["OWNER", "ADMIN", "MANAGER"] },
  {
    resource: "page.collaborator",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "page.collaborator",
    action: "add",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "page.collaborator",
    action: "remove",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Board permissions ─────────────────────────────────────────────────────
  {
    resource: "board",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "board",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "board",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  { resource: "board", action: "delete", roles: ["OWNER", "ADMIN", "MANAGER"] },
  {
    resource: "board",
    action: "archive",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  { resource: "board", action: "lock", roles: ["OWNER", "ADMIN", "MANAGER"] },
  {
    resource: "board.collaborator",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "board.collaborator",
    action: "add",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "board.collaborator",
    action: "remove",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Chat permissions ──────────────────────────────────────────────────────
  {
    resource: "channel",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "channel",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "channel",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  { resource: "channel", action: "delete", roles: ["OWNER", "ADMIN"] },
  { resource: "channel", action: "archive", roles: ["OWNER", "ADMIN"] },
  {
    resource: "channel.member",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "channel.member",
    action: "add",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "channel.member",
    action: "remove",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },
  {
    resource: "message",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "message",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "message",
    action: "update",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "message",
    action: "delete",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "thread",
    action: "create",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "thread",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  { resource: "thread", action: "close", roles: ["OWNER", "ADMIN", "MANAGER"] },
  {
    resource: "thread",
    action: "delete",
    roles: ["OWNER", "ADMIN", "MANAGER"],
  },

  // ── Vault permissions ───────────────────────────────────────────────────
  {
    resource: "vault",
    action: "read",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
  },
  {
    resource: "vault",
    action: "write",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "vault",
    action: "upload",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  { resource: "vault", action: "delete", roles: ["OWNER", "ADMIN", "MANAGER"] },
  {
    resource: "vault",
    action: "move",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    resource: "vault",
    action: "pin",
    roles: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
  },
];

// ── Seed logic ───────────────────────────────────────────────────────────────

async function seedSystemRoles(): Promise<Map<string, string>> {
  console.log("⚡ Seeding system roles...");
  const roleIdMap = new Map<string, string>();

  for (const role of SYSTEM_ROLES) {
    const existing = await db.role.findFirst({
      where: { name: role.name, workspaceId: null, isSystem: true },
    });

    let id: string;
    if (existing) {
      await db.role.update({
        where: { id: existing.id },
        data: { rank: role.rank, description: role.description },
      });
      id = existing.id;
    } else {
      const created = await db.role.create({
        data: {
          name: role.name,
          rank: role.rank,
          scopeType: role.scopeType,
          isSystem: true,
          description: role.description,
          workspaceId: null,
        },
      });
      id = created.id;
    }
    roleIdMap.set(role.name, id);
  }

  console.log(`✅ ${SYSTEM_ROLES.length} system roles seeded`);
  return roleIdMap;
}

async function seedRolePermissions(
  roleIdMap: Map<string, string>
): Promise<void> {
  console.log("⚡ Seeding role-permission assignments...");
  let count = 0;

  for (const grant of GRANTS) {
    const permission = await db.permission.findUnique({
      where: {
        resource_action: { resource: grant.resource, action: grant.action },
      },
    });

    if (!permission) {
      console.warn(
        `⚠️  Permission not found: ${grant.resource}:${grant.action} — run seed-permissions first`
      );
      continue;
    }

    for (const roleName of grant.roles) {
      const roleId = roleIdMap.get(roleName);
      if (!roleId) {
        console.warn(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        create: {
          roleId,
          permissionId: permission.id,
          effect: "ALLOW",
          ...(grant.conditions !== undefined && {
            conditions: grant.conditions,
          }),
        },
        update: {
          effect: "ALLOW",
          ...(grant.conditions !== undefined && {
            conditions: grant.conditions,
          }),
        },
      });
      count++;
    }
  }

  console.log(`✅ ${count} role-permission assignments seeded`);
}

async function main(): Promise<void> {
  const roleIdMap = await seedSystemRoles();
  await seedRolePermissions(roleIdMap);
}

main()
  .catch((err) => {
    console.error("❌ Role-permission seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
