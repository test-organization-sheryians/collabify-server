import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { isProjectMember } from "./is-project-member";
import { isWorkspaceAdminOrAbove } from "./is-workspace-admin";

/**
 * isProjectManager — checks if userId has MANAGER role in the project,
 * OR is a workspace ADMIN/OWNER (who implicitly manage all projects).
 *
 * Note: ProjectMember uses projectRole relation (nullable). When no project
 * role is assigned, the user is treated as a basic member (not manager).
 *
 * Resolution order:
 *   1. Check project role via projectRole relation
 *   2. Fallback: workspace ADMIN or OWNER
 */
export async function isProjectManager(
  projectId: string,
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  // Check explicit project manager role
  const projectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: {
      projectRole: {
        select: { name: true },
      },
    },
  });

  if (projectMember?.projectRole?.name === "MANAGER") return true;

  // Fallback: workspace ADMIN or OWNER can manage all projects
  return isWorkspaceAdminOrAbove(workspaceId, userId, redis, db);
}

export { isProjectMember };
