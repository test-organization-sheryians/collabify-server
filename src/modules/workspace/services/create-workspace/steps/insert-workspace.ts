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
  {
    name: "ADMIN",
    rank: 80,
    description: "Manage members, projects, and settings",
  },
  { name: "MEMBER", rank: 50, description: "Standard workspace member" },
  { name: "GUEST", rank: 10, description: "Limited read-only access" },
] as const;

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

      // 2. Seed system roles for this workspace
      const roles = await Promise.all(
        SYSTEM_ROLES.map((r) =>
          tx.role.create({
            data: {
              workspaceId: workspace.id,
              name: r.name,
              rank: r.rank,
              description: r.description,
              isSystem: true,
              scopeType: "WORKSPACE",
            },
          })
        )
      );

      const ownerRole = roles.find((r) => r.name === "OWNER")!;

      // 3. Create the creator as OWNER member
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
