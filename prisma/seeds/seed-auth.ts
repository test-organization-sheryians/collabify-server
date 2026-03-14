/**
 * seed-auth.ts — Complete Authorization Seed
 *
 * Does everything in one shot, safe to re-run (all upserts):
 *   1. Seed all Permission rows from module manifests
 *   2. For every existing workspace:
 *      a. Ensure 4 WORKSPACE system roles exist (OWNER/ADMIN/MEMBER/GUEST)
 *      b. Ensure 3 PROJECT template roles exist (MANAGER/CONTRIBUTOR/VIEWER)
 *   3. Assign all role-permissions to workspace system roles
 *
 * Run:
 *   bun run prisma/seeds/seed-auth.ts
 *
 * Rank mapping:
 *   100 = OWNER        (full workspace control)
 *    80 = ADMIN        (manage members, projects, settings)
 *    50 = MEMBER       (standard contributor)
 *    10 = GUEST        (minimal read-only)
 *    80 = MANAGER      (project — full project access)
 *    50 = CONTRIBUTOR  (project — create & edit content)
 *    10 = VIEWER       (project — read-only)
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

// ── Module permission manifests ──────────────────────────────────────────────
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

// ── Role templates ────────────────────────────────────────────────────────────

const WORKSPACE_SYSTEM_ROLES = [
  { name: "OWNER",  rank: 100, description: "Full control over the workspace" },
  { name: "ADMIN",  rank: 80,  description: "Manage members, projects, and settings" },
  { name: "MEMBER", rank: 50,  description: "Standard workspace member" },
  { name: "GUEST",  rank: 10,  description: "Limited read-only access" },
] as const;

const PROJECT_SYSTEM_ROLES = [
  { name: "MANAGER",     rank: 80, description: "Full project access — manage members, content, and settings" },
  { name: "CONTRIBUTOR", rank: 50, description: "Create and edit project content" },
  { name: "VIEWER",      rank: 10, description: "Read-only access to project content" },
] as const;

// ── Role-permission grants ────────────────────────────────────────────────────
// Format: { resource, action, roles[] }
// These are applied to WORKSPACE system roles only.
// PROJECT system roles don't need role-permissions — the PermissionEngine
// falls back to workspace roles for project-scoped operations.

const GRANTS: Array<{
  resource: string;
  action: string;
  roles: string[];
  conditions?: Prisma.InputJsonValue;
}> = [
  // ── Workspace ─────────────────────────────────────────────────────────────
  { resource: "workspace", action: "create",   roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace", action: "read",     roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace", action: "update",   roles: ["OWNER", "ADMIN"] },
  { resource: "workspace", action: "delete",   roles: ["OWNER"] },
  { resource: "workspace", action: "transfer", roles: ["OWNER"] },
  // Workspace roles
  { resource: "workspace.role", action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role", action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role", action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role", action: "assign-permission", roles: ["OWNER", "ADMIN"] },
  // Workspace members
  { resource: "workspace.member", action: "read",        roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace.member", action: "invite",      roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member", action: "remove",      roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member", action: "role-update", roles: ["OWNER", "ADMIN"] },

  // ── Project ───────────────────────────────────────────────────────────────
  { resource: "project", action: "create",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "project", action: "read",    roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project", action: "update",  roles: ["OWNER", "ADMIN"] },
  { resource: "project", action: "delete",  roles: ["OWNER", "ADMIN"] },
  { resource: "project", action: "archive", roles: ["OWNER", "ADMIN"] },
  // Project roles
  { resource: "project.role", action: "create", roles: ["OWNER", "ADMIN"] },
  { resource: "project.role", action: "update", roles: ["OWNER", "ADMIN"] },
  { resource: "project.role", action: "delete", roles: ["OWNER", "ADMIN"] },
  // Project members
  { resource: "project.member", action: "read",        roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project.member", action: "add",         roles: ["OWNER", "ADMIN"] },
  { resource: "project.member", action: "remove",      roles: ["OWNER", "ADMIN"] },
  { resource: "project.member", action: "role-update", roles: ["OWNER", "ADMIN"] },

  // ── Issue ─────────────────────────────────────────────────────────────────
  { resource: "issue", action: "create", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue", action: "update", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue", action: "delete", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.status", action: "create", roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.status", action: "update", roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status", action: "delete", roles: ["OWNER", "ADMIN"] },
  { resource: "issue.label",  action: "create", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",  action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.label",  action: "update", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",  action: "delete", roles: ["OWNER", "ADMIN"] },

  // ── Page ──────────────────────────────────────────────────────────────────
  { resource: "page", action: "create",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page", action: "read",    roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page", action: "update",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page", action: "delete",  roles: ["OWNER", "ADMIN"] },
  { resource: "page", action: "archive", roles: ["OWNER", "ADMIN"] },
  { resource: "page", action: "lock",    roles: ["OWNER", "ADMIN"] },
  { resource: "page.collaborator", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page.collaborator", action: "add",    roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page.collaborator", action: "remove", roles: ["OWNER", "ADMIN"] },

  // ── Board (Whiteboard) ────────────────────────────────────────────────────
  { resource: "board", action: "create",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board", action: "read",    roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board", action: "update",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board", action: "delete",  roles: ["OWNER", "ADMIN"] },
  { resource: "board", action: "archive", roles: ["OWNER", "ADMIN"] },
  { resource: "board", action: "lock",    roles: ["OWNER", "ADMIN"] },
  { resource: "board.collaborator", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board.collaborator", action: "add",    roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board.collaborator", action: "remove", roles: ["OWNER", "ADMIN"] },

  // ── Chat ──────────────────────────────────────────────────────────────────
  { resource: "channel", action: "create",  roles: ["OWNER", "ADMIN"] },
  { resource: "channel", action: "read",    roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel", action: "update",  roles: ["OWNER", "ADMIN"] },
  { resource: "channel", action: "delete",  roles: ["OWNER", "ADMIN"] },
  { resource: "channel", action: "archive", roles: ["OWNER", "ADMIN"] },
  { resource: "channel.member", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel.member", action: "add",    roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "channel.member", action: "remove", roles: ["OWNER", "ADMIN"] },
  { resource: "message", action: "create", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "message", action: "update", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message", action: "delete", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",  action: "create", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",  action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "thread",  action: "close",  roles: ["OWNER", "ADMIN"] },
  { resource: "thread",  action: "delete", roles: ["OWNER", "ADMIN"] },

  // ── Vault ─────────────────────────────────────────────────────────────────
  { resource: "vault", action: "read",   roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "vault", action: "write",  roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault", action: "upload", roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault", action: "delete", roles: ["OWNER", "ADMIN"] },
  { resource: "vault", action: "move",   roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault", action: "pin",    roles: ["OWNER", "ADMIN", "MEMBER"] },
];

// ── Helper: build lookup map for permissions already in DB ───────────────────
async function loadPermissionMap(): Promise<Map<string, string>> {
  const perms = await db.permission.findMany({ select: { id: true, resource: true, action: true } });
  const map = new Map<string, string>();
  for (const p of perms) map.set(`${p.resource}:${p.action}`, p.id);
  return map;
}

// ── 1. Seed Permission rows ───────────────────────────────────────────────────
async function seedPermissions(): Promise<void> {
  const ALL = [
    ...WORKSPACE_PERMISSIONS,
    ...PROJECT_PERMISSIONS,
    ...ISSUE_PERMISSIONS,
    ...PAGE_PERMISSIONS,
    ...BOARD_PERMISSIONS,
    ...CHAT_PERMISSIONS,
    ...VAULT_PERMISSIONS,
  ];

  // Also add role-management permissions not in any existing manifest
  const EXTRA_PERMISSIONS = [
    { resource: "workspace.role", action: "create",           module: "workspace", description: "Create a custom workspace role",     hasConditions: false },
    { resource: "workspace.role", action: "update",           module: "workspace", description: "Update a custom workspace role",     hasConditions: false },
    { resource: "workspace.role", action: "delete",           module: "workspace", description: "Delete a custom workspace role",     hasConditions: false },
    { resource: "workspace.role", action: "assign-permission",module: "workspace", description: "Assign/remove permissions on a role",hasConditions: false },
    { resource: "project.role",   action: "create",           module: "project",   description: "Create a custom project role",       hasConditions: false },
    { resource: "project.role",   action: "update",           module: "project",   description: "Update a custom project role",       hasConditions: false },
    { resource: "project.role",   action: "delete",           module: "project",   description: "Delete a custom project role",       hasConditions: false },
  ];

  console.log(`⚡ Seeding ${ALL.length + EXTRA_PERMISSIONS.length} permissions...`);
  let count = 0;
  for (const perm of [...ALL, ...EXTRA_PERMISSIONS]) {
    await db.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      create: { resource: perm.resource, action: perm.action, description: perm.description, module: perm.module, hasConditions: perm.hasConditions },
      update: { description: perm.description, module: perm.module, hasConditions: perm.hasConditions },
    });
    count++;
  }
  console.log(`✅ ${count} permissions upserted`);
}

// ── 2. Ensure system roles exist for a workspace ─────────────────────────────
async function ensureWorkspaceRoles(workspaceId: string): Promise<Map<string, string>> {
  const roleNameMap = new Map<string, string>();

  for (const r of WORKSPACE_SYSTEM_ROLES) {
    // Prisma can't upsert on a composite unique that includes nullable columns.
    // Use findFirst + create/update instead.
    let role = await db.role.findFirst({
      where: { workspaceId, projectId: null, name: r.name, scopeType: "WORKSPACE" },
    });
    if (role) {
      role = await db.role.update({
        where: { id: role.id },
        data: { rank: r.rank, description: r.description },
      });
    } else {
      role = await db.role.create({
        data: { workspaceId, projectId: null, name: r.name, rank: r.rank, description: r.description, isSystem: true, scopeType: "WORKSPACE" },
      });
    }
    roleNameMap.set(r.name, role.id);
  }

  for (const r of PROJECT_SYSTEM_ROLES) {
    const existing = await db.role.findFirst({
      where: { workspaceId, projectId: null, name: r.name, scopeType: "PROJECT" },
    });
    if (existing) {
      await db.role.update({ where: { id: existing.id }, data: { rank: r.rank, description: r.description } });
    } else {
      await db.role.create({
        data: { workspaceId, projectId: null, name: r.name, rank: r.rank, description: r.description, isSystem: true, scopeType: "PROJECT" },
      });
    }
  }

  return roleNameMap;
}


// ── 3. Seed role-permissions for a workspace ──────────────────────────────────
async function seedRolePermissions(
  workspaceId: string,
  roleNameMap: Map<string, string>,
  permMap: Map<string, string>
): Promise<number> {
  let count = 0;
  for (const grant of GRANTS) {
    const permId = permMap.get(`${grant.resource}:${grant.action}`);
    if (!permId) {
      console.warn(`  ⚠️  Permission not found: ${grant.resource}:${grant.action} — skipped`);
      continue;
    }
    for (const roleName of grant.roles) {
      const roleId = roleNameMap.get(roleName);
      if (!roleId) continue; // system role might not exist yet for old workspaces
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
        create: { roleId, permissionId: permId, effect: "ALLOW", ...(grant.conditions && { conditions: grant.conditions }) },
        update: { effect: "ALLOW", ...(grant.conditions && { conditions: grant.conditions }) },
      });
      count++;
    }
  }
  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // 1. permissions
  await seedPermissions();

  // 2. load permission map (after seeding)
  const permMap = await loadPermissionMap();

  // 3. find all workspaces
  const workspaces = await db.workspace.findMany({ select: { id: true, slug: true } });
  if (workspaces.length === 0) {
    console.log("ℹ️  No workspaces found — permissions seeded, roles will be created when first workspace is made.");
    return;
  }

  console.log(`\n⚡ Processing ${workspaces.length} workspace(s)...`);
  let totalRolePerms = 0;

  for (const ws of workspaces) {
    console.log(`\n  🏢 Workspace: ${ws.slug} (${ws.id})`);
    const roleNameMap = await ensureWorkspaceRoles(ws.id);
    console.log(`     ✅ ${roleNameMap.size} workspace roles ensured`);
    const rpCount = await seedRolePermissions(ws.id, roleNameMap, permMap);
    console.log(`     ✅ ${rpCount} role-permissions seeded`);
    totalRolePerms += rpCount;
  }

  console.log(`\n✨ Done — ${totalRolePerms} total role-permission rows across ${workspaces.length} workspace(s)`);
}

main()
  .catch((err) => {
    console.error("❌ seed-auth failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
