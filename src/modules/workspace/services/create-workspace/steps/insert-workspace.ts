/**
 * Create the workspace, seed all 4 system roles, and create the OWNER membership
 * in a single atomic transaction.
 *
 * WorkspaceMember.role was dropped in the authorization schema migration —
 * membership now requires a roleId FK to the `roles` table.
 * System roles (OWNER/ADMIN/MEMBER/GUEST) must be created within the same
 * transaction so they exist before the member row is inserted.
 *
 * Handles Prisma unique-constraint (P2002) and FK (P2003) errors.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

const SYSTEM_ROLES = [
  { name: "OWNER", rank: 100, description: "Full control over the workspace" },
  { name: "ADMIN", rank: 80,  description: "Manage members, projects, and settings" },
  { name: "MEMBER", rank: 50, description: "Standard workspace member" },
  { name: "GUEST",  rank: 10, description: "Limited read-only access" },
] as const;

/** Shared project role templates — available across all projects in the workspace. */
const SYSTEM_PROJECT_ROLES = [
  { name: "MANAGER",     rank: 80, description: "Full project access — manage members, content, and settings" },
  { name: "CONTRIBUTOR", rank: 50, description: "Create and edit project content" },
  { name: "VIEWER",      rank: 10, description: "Read-only access to project content" },
] as const;

// ── Role-permission grants ────────────────────────────────────────────────────
// Format: { resource, action, roles[] }
// Defines which permissions are granted to which WORKSPACE system roles.
// Missing Permission rows are silently skipped (permissions must be seeded first).

const GRANTS: Array<{ resource: string; action: string; roles: string[] }> = [
  // Workspace
  { resource: "workspace",        action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace",        action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "workspace",        action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace",        action: "delete",           roles: ["OWNER"] },
  { resource: "workspace",        action: "transfer",         roles: ["OWNER"] },
  // Workspace roles
  { resource: "workspace.role",   action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",   action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",   action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.role",   action: "assign-permission",roles: ["OWNER", "ADMIN"] },
  // Workspace members
  { resource: "workspace.member", action: "read",             roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "workspace.member", action: "invite",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member", action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "workspace.member", action: "role-update",      roles: ["OWNER", "ADMIN"] },
  // Project
  { resource: "project",          action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "project",          action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project",          action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "project",          action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "project",          action: "archive",          roles: ["OWNER", "ADMIN"] },
  // Project roles
  { resource: "project.role",     action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.role",     action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.role",     action: "delete",           roles: ["OWNER", "ADMIN"] },
  // Project members
  { resource: "project.member",   action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "project.member",   action: "add",              roles: ["OWNER", "ADMIN"] },
  { resource: "project.member",   action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "project.member",   action: "role-update",      roles: ["OWNER", "ADMIN"] },
  // Issues
  { resource: "issue",            action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue",            action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue",            action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue",            action: "delete",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.status",     action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status",     action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.status",     action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.status",     action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "issue.label",      action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",      action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "issue.label",      action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "issue.label",      action: "delete",           roles: ["OWNER", "ADMIN"] },
  // Pages
  { resource: "page",             action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page",             action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page",             action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page",             action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "page",             action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "page",             action: "lock",             roles: ["OWNER", "ADMIN"] },
  { resource: "page.collaborator",action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "page.collaborator",action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "page.collaborator",action: "remove",           roles: ["OWNER", "ADMIN"] },
  // Boards
  { resource: "board",            action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board",            action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board",            action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board",            action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "board",            action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "board",            action: "lock",             roles: ["OWNER", "ADMIN"] },
  { resource: "board.collaborator",action: "read",            roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "board.collaborator",action: "add",             roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "board.collaborator",action: "remove",          roles: ["OWNER", "ADMIN"] },
  // Chat
  { resource: "channel",          action: "create",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",          action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel",          action: "update",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",          action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "channel",          action: "archive",          roles: ["OWNER", "ADMIN"] },
  { resource: "channel.member",   action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "channel.member",   action: "add",              roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "channel.member",   action: "remove",           roles: ["OWNER", "ADMIN"] },
  { resource: "message",          action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message",          action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "message",          action: "update",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "message",          action: "delete",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",           action: "create",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "thread",           action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "thread",           action: "close",            roles: ["OWNER", "ADMIN"] },
  { resource: "thread",           action: "delete",           roles: ["OWNER", "ADMIN"] },
  // Vault
  { resource: "vault",            action: "read",             roles: ["OWNER", "ADMIN", "MEMBER", "GUEST"] },
  { resource: "vault",            action: "write",            roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",            action: "upload",           roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",            action: "delete",           roles: ["OWNER", "ADMIN"] },
  { resource: "vault",            action: "move",             roles: ["OWNER", "ADMIN", "MEMBER"] },
  { resource: "vault",            action: "pin",              roles: ["OWNER", "ADMIN", "MEMBER"] },
];

export async function insertWorkspace(
  sanitizedName: string,
  normalizedSlug: string,
  userId: string,
  lockKey: string,
  db: PrismaClient,
  redis: Redis
) {
  try {
    return await db.$transaction(async (tx) => {
      // 1. Create the workspace
      const workspace = await tx.workspace.create({
        data: {
          name: sanitizedName,
          slug: normalizedSlug,
        },
      });

      // 2. Seed system workspace roles (scopeType=WORKSPACE, projectId=null)
      const roles = await Promise.all(
        SYSTEM_ROLES.map((r) =>
          tx.role.create({
            data: {
              workspaceId: workspace.id,
              projectId: null,  // workspace-wide — not tied to any project
              name: r.name,
              rank: r.rank,
              description: r.description,
              isSystem: true,
              scopeType: "WORKSPACE",
            },
          })
        )
      );

      // 2b. Seed system project role templates (scopeType=PROJECT, projectId=null)
      //     These are workspace-wide templates reused across all projects.
      //     Project admins can also create project-specific roles (projectId set).
      await Promise.all(
        SYSTEM_PROJECT_ROLES.map((r) =>
          tx.role.create({
            data: {
              workspaceId: workspace.id,
              projectId: null,  // template — not tied to a specific project
              name: r.name,
              rank: r.rank,
              description: r.description,
              isSystem: true,
              scopeType: "PROJECT",
            },
          })
        )
      );

      // 3. Build a name → id map for workspace system roles
      const roleMap = new Map(roles.map((r) => [r.name, r.id]));

      // 4. Load all permissions from DB (seeded once at deploy via bun run db:seed:auth)
      const allPerms = await tx.permission.findMany({
        select: { id: true, resource: true, action: true },
      });
      const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));

      // 5. Assign role-permissions for all workspace system roles
      const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];
      for (const grant of GRANTS) {
        const permId = permMap.get(`${grant.resource}:${grant.action}`);
        if (!permId) continue; // permission row missing — skip; don't fail workspace creation
        for (const roleName of grant.roles) {
          const roleId = roleMap.get(roleName);
          if (!roleId) continue;
          rolePermData.push({ roleId, permissionId: permId, effect: "ALLOW" });
        }
      }

      if (rolePermData.length > 0) {
        await tx.rolePermission.createMany({ data: rolePermData, skipDuplicates: true });
      }

      // 6. Create the creator as OWNER member
      const ownerRole = roles.find((r) => r.name === "OWNER")!;
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      return workspace;
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        await redis.del(lockKey);
        throw AppError.conflict(
          "Workspace URL is already taken.",
          "WORKSPACE_CREATION_DB_CONFLICT"
        );
      }
      if (error.code === "P2003") {
        await redis.del(lockKey);
        throw new AppError(
          "User account issue. Please re-login.",
          "UNAUTHORIZED",
          401
        );
      }
    }
    throw error;
  }
}
