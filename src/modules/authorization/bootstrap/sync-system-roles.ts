/**
 * sync-system-roles.ts
 *
 * Bootstrap: System Role + Permission Sync (runs on every server boot).
 *
 * For every workspace in the DB, ensures the 4 WORKSPACE system roles
 * (OWNER / ADMIN / MEMBER / GUEST) and 3 PROJECT system roles
 * (MANAGER / CONTRIBUTOR / GUEST) exist with correct rank + description.
 *
 * Seeds role-permissions for WORKSPACE roles from WORKSPACE_GRANTS.
 * Seeds role-permissions for PROJECT roles (per project) from PROJECT_GRANTS.
 *
 * Guarantees:
 *   - Never deletes roles or role-permissions (additive-only)
 *   - Skips workspaces already seeded (Redis fast-path, bypassed by --force)
 *   - Idempotent upserts — safe to re-run on every boot
 *   - All permission strings use strict colon-notation (no dots)
 */
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("bootstrap:sync-system-roles");

const REDIS_SEEDED_PREFIX = "bootstrap:ws-roles-seeded:";

// ── Role templates ────────────────────────────────────────────────────────────

const WORKSPACE_SYSTEM_ROLES = [
  { name: "OWNER",  rank: 100, description: "Full control over the workspace" },
  { name: "ADMIN",  rank: 80,  description: "Manage members, projects, and settings" },
  { name: "MEMBER", rank: 50,  description: "Standard workspace member" },
  { name: "GUEST",  rank: 10,  description: "Limited read-only access" },
] as const;

const PROJECT_SYSTEM_ROLES = [
  { name: "MANAGER",     rank: 80, description: "Full project control — members, content, and settings" },
  { name: "CONTRIBUTOR", rank: 50, description: "Create and edit project content" },
  { name: "GUEST",       rank: 10, description: "Read-only access to project content" },
] as const;

// ── Workspace role grants ─────────────────────────────────────────────────────
// Defines which permissions each workspace system role holds.
// resource + ":" + action = the Permission row's unique key.

type Grant = { resource: string; action: string; roles: string[] };

const WORKSPACE_GRANTS: Grant[] = [
  // ── Core workspace ──────────────────────────────────────────────────────────
  { resource: "workspace",         action: "create",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace",         action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace",         action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace",         action: "delete",            roles: ["OWNER"] },
  { resource: "workspace",         action: "transfer",          roles: ["OWNER"] },
  // ── Workspace roles ─────────────────────────────────────────────────────────
  { resource: "workspace:role",    action: "create",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",    action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",    action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:role",    action: "assign-permission", roles: ["OWNER", "ADMIN"] },
  // ── Workspace members ───────────────────────────────────────────────────────
  { resource: "workspace:member",  action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace:member",  action: "invite",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:member",  action: "remove",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:member",  action: "role-update",       roles: ["OWNER"] },
  // ── Workspace invites ───────────────────────────────────────────────────────
  { resource: "workspace:invite",  action: "view",              roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:invite",  action: "cancel",            roles: ["OWNER", "ADMIN"] },
  { resource: "workspace:invite",  action: "resend",            roles: ["OWNER", "ADMIN"] },
  // ── Workspace settings ──────────────────────────────────────────────────────
  { resource: "workspace:settings", action: "view",             roles: ["OWNER", "ADMIN"] },
  // ── Project management (workspace-scope actions) ────────────────────────────
  { resource: "project",           action: "create",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "project",           action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project",           action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "project",           action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "project",           action: "archive",           roles: ["OWNER", "ADMIN"] },
  { resource: "project:role",      action: "create",            roles: ["OWNER", "ADMIN"] },
  { resource: "project:role",      action: "update",            roles: ["OWNER", "ADMIN"] },
  { resource: "project:role",      action: "delete",            roles: ["OWNER", "ADMIN"] },
  { resource: "project:member",    action: "read",              roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project:member",    action: "add",               roles: ["OWNER", "ADMIN"] },
  { resource: "project:member",    action: "remove",            roles: ["OWNER", "ADMIN"] },
  { resource: "project:member",    action: "role-update",       roles: ["OWNER", "ADMIN"] },
  { resource: "project:settings",  action: "view",              roles: ["OWNER", "ADMIN"] },
];

// ── Project role grants ───────────────────────────────────────────────────────
// Defines which permissions each project system role holds.
// These are seeded per-project (not per-workspace).

const PROJECT_GRANTS: Grant[] = [
  // ── Project management ──────────────────────────────────────────────────────
  { resource: "project:settings",       action: "view",           roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "project:member",         action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "project:member",         action: "add",            roles: ["MANAGER"] },
  { resource: "project:member",         action: "remove",         roles: ["MANAGER"] },
  { resource: "project:member",         action: "role-update",    roles: ["MANAGER"] },
  { resource: "project:role",           action: "create",         roles: ["MANAGER"] },
  { resource: "project:role",           action: "update",         roles: ["MANAGER"] },
  { resource: "project:role",           action: "delete",         roles: ["MANAGER"] },
  // ── Issues ──────────────────────────────────────────────────────────────────
  { resource: "issue",                  action: "create",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                  action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "issue",                  action: "update",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                  action: "delete",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",                  action: "assign",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:status",           action: "manage",         roles: ["MANAGER"] },
  { resource: "issue:label",            action: "manage",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:comment",          action: "create",         roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "issue:comment",          action: "delete",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue:comment",          action: "delete-any",     roles: ["MANAGER"] },
  // ── Pages ───────────────────────────────────────────────────────────────────
  { resource: "page",                   action: "create",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",                   action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "page",                   action: "update",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",                   action: "delete",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",                   action: "archive",        roles: ["MANAGER"] },
  { resource: "page",                   action: "lock",           roles: ["MANAGER"] },
  { resource: "page",                   action: "share",          roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page:collaborator",      action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "page:collaborator",      action: "add",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page:collaborator",      action: "remove",         roles: ["MANAGER"] },
  // ── Whiteboard ──────────────────────────────────────────────────────────────
  { resource: "whiteboard",             action: "create",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",             action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "whiteboard",             action: "edit",           roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",             action: "update",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard",             action: "delete",         roles: ["MANAGER"] },
  { resource: "whiteboard",             action: "archive",        roles: ["MANAGER"] },
  { resource: "whiteboard",             action: "share",          roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard:collaborator", action: "read",          roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "whiteboard:collaborator", action: "add",           roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "whiteboard:collaborator", action: "remove",        roles: ["MANAGER"] },
  // ── Chat ────────────────────────────────────────────────────────────────────
  { resource: "chat:channel",           action: "create",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:channel",           action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:channel",           action: "update",         roles: ["MANAGER"] },
  { resource: "chat:channel",           action: "delete",         roles: ["MANAGER"] },
  { resource: "chat:channel",           action: "archive",        roles: ["MANAGER"] },
  { resource: "chat:channel:member",    action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:channel:member",    action: "add",            roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "chat:channel:member",    action: "remove",         roles: ["MANAGER"] },
  { resource: "chat:message",           action: "send",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:message",           action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:message",           action: "edit-own",       roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:message",           action: "delete-own",     roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "chat:message",           action: "delete-any",     roles: ["MANAGER"] },
  { resource: "chat:dm",                action: "create",         roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  // ── Vault ───────────────────────────────────────────────────────────────────
  { resource: "vault",                  action: "read",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "vault:file",             action: "upload",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:file",             action: "download",       roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "vault:file",             action: "rename",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:file",             action: "delete",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:file",             action: "move",           roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",           action: "create",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",           action: "rename",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault:folder",           action: "delete",         roles: ["MANAGER"] },
  { resource: "vault:folder",           action: "pin",            roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
  { resource: "vault:quota",            action: "view",           roles: ["MANAGER", "CONTRIBUTOR", "GUEST"] },
];

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Upsert all 4 workspace system roles; return name→id map */
async function ensureWorkspaceRoles(
  workspaceId: string,
  db: PrismaClient
): Promise<Map<string, string>> {
  const roleNameMap = new Map<string, string>();

  for (const r of WORKSPACE_SYSTEM_ROLES) {
    let role = await db.role.findFirst({
      where: { workspaceId, projectId: null, name: r.name, scopeType: "WORKSPACE" },
    });
    if (role) {
      role = await db.role.update({
        where: { id: role.id },
        data: { rank: r.rank, description: r.description, isSystem: true },
      });
    } else {
      role = await db.role.create({
        data: {
          workspaceId,
          projectId: null,
          name: r.name,
          rank: r.rank,
          description: r.description,
          isSystem: true,
          scopeType: "WORKSPACE",
        },
      });
    }
    roleNameMap.set(r.name, role.id);
  }

  return roleNameMap;
}

/** Upsert 3 project system roles for a specific project; return name→id map */
async function ensureProjectRoles(
  workspaceId: string,
  projectId: string,
  db: PrismaClient
): Promise<Map<string, string>> {
  const roleNameMap = new Map<string, string>();

  for (const r of PROJECT_SYSTEM_ROLES) {
    let role = await db.role.findFirst({
      where: { workspaceId, projectId, name: r.name, scopeType: "PROJECT" },
    });
    if (role) {
      role = await db.role.update({
        where: { id: role.id },
        data: { rank: r.rank, description: r.description, isSystem: true },
      });
    } else {
      role = await db.role.create({
        data: {
          workspaceId,
          projectId,
          name: r.name,
          rank: r.rank,
          description: r.description,
          isSystem: true,
          scopeType: "PROJECT",
        },
      });
    }
    roleNameMap.set(r.name, role.id);
  }

  return roleNameMap;
}

/** Upsert role-permission grants for a set of roles */
async function seedGrants(
  grants: Grant[],
  roleNameMap: Map<string, string>,
  permMap: Map<string, string>,
  db: PrismaClient
): Promise<number> {
  let count = 0;
  for (const grant of grants) {
    const permId = permMap.get(`${grant.resource}:${grant.action}`);
    if (!permId) {
      // Permission not yet in DB — syncPermissions runs first, so this shouldn't happen
      logger.warn(`Permission not found in DB: "${grant.resource}:${grant.action}" — skipping`);
      continue;
    }
    for (const roleName of grant.roles) {
      const roleId = roleNameMap.get(roleName);
      if (!roleId) continue;

      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
        create: { roleId, permissionId: permId, effect: "ALLOW" },
        update: { effect: "ALLOW" },
      });
      count++;
    }
  }
  return count;
}

// ── Public bootstrap function ─────────────────────────────────────────────────

/**
 * syncSystemRoles
 *
 * Called by bootstrap.ts on every server boot (after syncPermissions).
 * Ensures all workspaces and projects have correct system roles + grants.
 *
 * @param force - When true, skips the Redis fast-path and re-seeds every workspace.
 *                Used by the reset-rbac migration script.
 */
export async function syncSystemRoles(
  db: PrismaClient,
  redis: Redis,
  { force = false }: { force?: boolean } = {}
): Promise<void> {
  // Build permission lookup map once (from the freshly synced Permission table)
  const perms = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
  });
  const permMap = new Map<string, string>();
  for (const p of perms) permMap.set(`${p.resource}:${p.action}`, p.id);

  logger.info(`Loaded ${permMap.size} permissions from DB`);

  // ── Process each workspace ──────────────────────────────────────────────────
  const workspaces = await db.workspace.findMany({ select: { id: true, slug: true } });

  for (const ws of workspaces) {
    const seededKey = `${REDIS_SEEDED_PREFIX}${ws.id}`;

    if (!force) {
      const alreadySeeded = await redis.get(seededKey);
      if (alreadySeeded === "1") {
        logger.debug(`Workspace already seeded — skipping`, { workspaceId: ws.id });
        continue;
      }
    }

    logger.info(`Seeding system roles for workspace: ${ws.slug}`);

    // 1. Workspace system roles + grants
    const wsRoleMap = await ensureWorkspaceRoles(ws.id, db);
    const wsRpCount = await seedGrants(WORKSPACE_GRANTS, wsRoleMap, permMap, db);
    logger.info(`  ✓ Workspace: ${wsRoleMap.size} roles, ${wsRpCount} role-permissions`);

    // 2. Project system roles + grants (per project in this workspace)
    const projects = await db.project.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, name: true },
    });

    let totalProjectRp = 0;
    for (const project of projects) {
      const projectRoleMap = await ensureProjectRoles(ws.id, project.id, db);
      const projectRpCount = await seedGrants(PROJECT_GRANTS, projectRoleMap, permMap, db);
      totalProjectRp += projectRpCount;
    }

    logger.info(`  ✓ Projects: ${projects.length} projects, ${totalProjectRp} role-permissions`);

    if (!force) {
      await redis.set(seededKey, "1");
    }
  }

  logger.info(`System role sync complete for ${workspaces.length} workspace(s)`);
}

// Re-export grants for use by reset-rbac.ts migration script
export { WORKSPACE_GRANTS, PROJECT_GRANTS, WORKSPACE_SYSTEM_ROLES, PROJECT_SYSTEM_ROLES };
