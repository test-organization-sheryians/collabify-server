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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Must match the GRANTS in insert-workspace.ts exactly
const GRANTS: Array<{ resource: string; action: string; roles: string[] }> = [
  { resource: "workspace",           action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace",           action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace",           action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace",           action: "delete",           roles: ["OWNER"] },
  { resource: "workspace",           action: "transfer",         roles: ["OWNER"] },
  { resource: "workspace.role",      action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",      action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",      action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",      action: "assign-permission",roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member",    action: "read",             roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace.member",    action: "invite",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member",    action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member",    action: "role-update",      roles: ["OWNER", "ADMIN"] },
  { resource: "project",             action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "project",             action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project",             action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "project",             action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "project",             action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "project.role",        action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.role",        action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.role",        action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.member",      action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project.member",      action: "add",              roles: ["OWNER", "ADMIN"] },
  { resource: "project.member",      action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.member",      action: "role-update",      roles: ["OWNER", "ADMIN"] },
  { resource: "issue",               action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue",               action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue",               action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue",               action: "delete",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.status",        action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status",        action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.status",        action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status",        action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.label",         action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",         action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.label",         action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",         action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "page",                action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page",                action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page",                action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page",                action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "page",                action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "page",                action: "lock",             roles: ["OWNER", "ADMIN"] },
  { resource: "page.collaborator",   action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page.collaborator",   action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page.collaborator",   action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "board",               action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board",               action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board",               action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board",               action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "board",               action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "board",               action: "lock",             roles: ["OWNER", "ADMIN"] },
  { resource: "board.collaborator",  action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board.collaborator",  action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board.collaborator",  action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",             action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",             action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel",             action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",             action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",             action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "channel.member",      action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel.member",      action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "channel.member",      action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "conversation",        action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "conversation",        action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "conversation",        action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "conversation.member", action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "conversation.member", action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "conversation.member", action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "message",             action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message",             action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "message",             action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message",             action: "delete",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",              action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",             action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "thread",              action: "close",            roles: ["OWNER", "ADMIN"] },
  { resource: "thread",              action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "vault",               action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "vault",               action: "write",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",               action: "upload",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",               action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "vault",               action: "move",             roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",               action: "pin",              roles: ["OWNER", "ADMIN", "MEMBER"] },
];

async function repairRolePermissions(): Promise<void> {
  console.log("🔍 Loading all permissions from DB...");
  const allPerms = await db.permission.findMany({ select: { id: true, resource: true, action: true } });
  const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));
  console.log(`✅ ${allPerms.length} permissions loaded`);

  console.log("🔍 Loading all workspace system roles...");
  // Only workspace-scoped system roles (not project roles)
  const wsRoles = await db.role.findMany({
    where: { scopeType: "WORKSPACE", isSystem: true },
    select: { id: true, name: true, workspaceId: true },
  });
  console.log(`✅ ${wsRoles.length} workspace roles found across all workspaces`);

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
    const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];

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
        console.log(`  ✅ Workspace ${workspaceId}: +${result.count} role-permissions backfilled`);
      }
    }
  }

  console.log(`\n✅ Done — ${totalAdded} rows backfilled across ${workspacesRepaired} workspaces`);
  console.log("⚠️  Flush Redis permission cache after running this: redis-cli KEYS 'perm:*' | xargs redis-cli DEL");
}

repairRolePermissions()
  .catch((err) => {
    console.error("❌ Repair failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
