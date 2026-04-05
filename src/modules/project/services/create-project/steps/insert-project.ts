/**
 * Atomically create the project, seed 3 project-scoped system roles, assign their
 * role-permissions, and create the creator as a MANAGER ProjectMember.
 *
 * Steps inside the transaction:
 *   1. Unique-key guard + create Project row
 *   2. Create 3 system project roles (MANAGER, CONTRIBUTOR, VIEWER) for this project
 *   3. Load Permission rows + assign RolePermission rows from PROJECT_GRANTS
 *   4. Create creator as ProjectMember with projectRoleId = MANAGER role
 *   5. Seed all 5 core plugins
 *
 * Handles Prisma P2002 unique constraint error.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { CreateProjectInput } from "../types";
import { PROJECT_GRANTS } from "../../../../../../prisma/seeds/shared/system-grants";

// ── Role-permission grants ────────────────────────────────────────────────────
// Canonical source of truth imported from prisma/seeds/shared/system-grants.ts.
// Uses correct colon-notation resource strings matching DB permission rows.
// MANAGER = full project control, CONTRIBUTOR = read/write, VIEWER = read-only.

// ── Project system role definitions ───────────────────────────────────────────
// Defined here — system-grants.ts owns what each role can do, this owns who they are.
const PROJECT_ROLE_TEMPLATES = [
  { name: "MANAGER",     rank: 80, description: "Full project access — manage members, content, and settings" },
  { name: "CONTRIBUTOR", rank: 50, description: "Create and edit project content" },
  { name: "VIEWER",      rank: 10, description: "Read-only access to project content" },
] as const;

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

      // 2. Seed 3 system project roles scoped to this project
      const projectRoles = await Promise.all(
        PROJECT_ROLE_TEMPLATES.map((r) =>
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

      // 6. Seed all 5 core plugins as active for the new project.
      //    isSystem = false — all plugins can be toggled by project admins.
      await tx.projectPlugin.createMany({
        data: [
          { projectId: project.id, type: "CHAT",       isSystem: false },
          { projectId: project.id, type: "WHITEBOARD", isSystem: false },
          { projectId: project.id, type: "PAGES",      isSystem: false },
          { projectId: project.id, type: "VAULT",      isSystem: false },
          { projectId: project.id, type: "ISSUES",     isSystem: false },
        ],
        skipDuplicates: true,
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
