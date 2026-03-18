/**
 * Atomically create the project, seed 3 project-scoped system roles, assign their
 * role-permissions, and create the creator as a MANAGER ProjectMember.
 *
 * Steps inside the transaction:
 *   1. Unique-key guard + create Project row
 *   2. Fetch workspace's template project roles (scopeType=PROJECT, projectId=null)
 *   3. Clone each template into a project-specific role (projectId = project.id)
 *   4. Load Permission rows + assign RolePermission rows from PROJECT_GRANTS
 *   5. Create creator as ProjectMember with projectRoleId = MANAGER role
 *
 * Handles Prisma P2002 unique constraint error.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { CreateProjectInput } from "../types";

// ── Project-scoped role-permission grants ─────────────────────────────────────
// Mirrors the GRANTS table in insert-workspace.ts, but scoped to PROJECT roles.
// MANAGER = full project control, CONTRIBUTOR = read/write content, VIEWER = read-only.
// Missing Permission rows are silently skipped — never fail project creation.

const PROJECT_GRANTS: Array<{ resource: string; action: string; roles: string[] }> = [
  // Project
  { resource: "project",            action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "project",            action: "update",      roles: ["MANAGER"] },
  // Project roles
  { resource: "project.role",       action: "create",      roles: ["MANAGER"] },
  { resource: "project.role",       action: "update",      roles: ["MANAGER"] },
  { resource: "project.role",       action: "delete",      roles: ["MANAGER"] },
  // Project members
  { resource: "project.member",     action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "project.member",     action: "add",         roles: ["MANAGER"] },
  { resource: "project.member",     action: "remove",      roles: ["MANAGER"] },
  { resource: "project.member",     action: "role-update", roles: ["MANAGER"] },
  // Issues
  { resource: "issue",              action: "create",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",              action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "issue",              action: "update",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue",              action: "delete",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue.status",       action: "create",      roles: ["MANAGER"] },
  { resource: "issue.status",       action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "issue.status",       action: "update",      roles: ["MANAGER"] },
  { resource: "issue.status",       action: "delete",      roles: ["MANAGER"] },
  { resource: "issue.label",        action: "create",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue.label",        action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "issue.label",        action: "update",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "issue.label",        action: "delete",      roles: ["MANAGER"] },
  // Pages
  { resource: "page",               action: "create",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",               action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "page",               action: "update",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page",               action: "delete",      roles: ["MANAGER"] },
  { resource: "page",               action: "archive",     roles: ["MANAGER"] },
  { resource: "page",               action: "lock",        roles: ["MANAGER"] },
  { resource: "page.collaborator",  action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "page.collaborator",  action: "add",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "page.collaborator",  action: "remove",      roles: ["MANAGER"] },
  // Boards (Whiteboard)
  { resource: "board",              action: "create",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "board",              action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "board",              action: "update",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "board",              action: "delete",      roles: ["MANAGER"] },
  { resource: "board",             action: "archive",      roles: ["MANAGER"] },
  { resource: "board",              action: "lock",        roles: ["MANAGER"] },
  { resource: "board.collaborator", action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "board.collaborator", action: "add",         roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "board.collaborator", action: "remove",      roles: ["MANAGER"] },
  // Vault
  { resource: "vault",              action: "read",        roles: ["MANAGER", "CONTRIBUTOR", "VIEWER"] },
  { resource: "vault",              action: "write",       roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault",              action: "upload",      roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault",              action: "delete",      roles: ["MANAGER"] },
  { resource: "vault",              action: "move",        roles: ["MANAGER", "CONTRIBUTOR"] },
  { resource: "vault",              action: "pin",         roles: ["MANAGER", "CONTRIBUTOR"] },
];

export async function insertProject(
  workspaceId: string,
  userId: string,
  slug: string,
  input: CreateProjectInput,
  db: PrismaClient
) {
  try {
    return await db.$transaction(async (tx) => {
      // 1. Unique-key guard
      const existing = await tx.project.findUnique({
        where: { workspaceId_key: { workspaceId, key: slug } },
        select: { id: true },
      });
      if (existing) {
        throw AppError.conflict(
          "Project key already exists",
          "PROJECT_CREATION_DB_CONFLICT"
        );
      }

      // 1b. Create the project
      const project = await tx.project.create({
        data: {
          workspaceId,
          key: slug,
          name: input.name,
          description: input.description,
        },
      });

      // 2. Fetch workspace template project roles (seeded at workspace creation)
      //    These have scopeType=PROJECT and projectId=null.
      const templateRoles = await tx.role.findMany({
        where: {
          workspaceId,
          scopeType: "PROJECT",
          projectId: null,
          isSystem: true,
        },
        select: { name: true, rank: true, description: true },
      });

      // 3. Clone each template as a project-specific role (projectId = project.id)
      const projectRoles = await Promise.all(
        templateRoles.map((r) =>
          tx.role.create({
            data: {
              workspaceId,
              projectId: project.id,
              name: r.name,
              rank: r.rank,
              description: r.description,
              isSystem: true,
              scopeType: "PROJECT",
            },
          })
        )
      );

      // 4. Assign role-permissions from PROJECT_GRANTS
      if (projectRoles.length > 0) {
        const allPerms = await tx.permission.findMany({
          select: { id: true, resource: true, action: true },
        });
        const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));
        const roleMap = new Map(projectRoles.map((r) => [r.name, r.id]));

        const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];
        for (const grant of PROJECT_GRANTS) {
          const permId = permMap.get(`${grant.resource}:${grant.action}`);
          if (!permId) continue; // permission row missing — skip, don't fail creation
          for (const roleName of grant.roles) {
            const roleId = roleMap.get(roleName);
            if (!roleId) continue;
            rolePermData.push({ roleId, permissionId: permId, effect: "ALLOW" });
          }
        }

        if (rolePermData.length > 0) {
          await tx.rolePermission.createMany({ data: rolePermData, skipDuplicates: true });
        }
      }

      // 5. Create creator as ProjectMember with MANAGER role (or null if no templates exist)
      const managerRole = projectRoles.find((r) => r.name === "MANAGER") ?? null;
      await tx.projectMember.create({
        data: {
          workspaceId,
          projectId: project.id,
          userId,
          projectRoleId: managerRole?.id ?? null,
        },
      });

      return project;
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw AppError.conflict(
        "Project key already exists (Constraint)",
        "PROJECT_CREATION_DB_CONFLICT"
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to create project",
      "PROJECT_CREATION_FAILED",
      500
    );
  }
}
