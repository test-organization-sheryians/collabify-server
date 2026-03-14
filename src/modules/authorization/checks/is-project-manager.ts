import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { isProjectMember } from "./is-project-member";
import { isWorkspaceAdminOrAbove } from "./is-workspace-admin";

/**
 * isProjectManager — checks if userId has MANAGER rank (>= 80) in the project,
 * OR is a workspace ADMIN/OWNER (who implicitly manage all projects).
 *
 * Note: ProjectMember uses projectRole relation (nullable). When no project
 * role is assigned, the user is treated as a basic member (not manager).
 *
 * Resolution order:
 *   1. Check project role rank >= PROJECT_MANAGER_RANK (80)
 *   2. Fallback: workspace ADMIN or OWNER
 */

const PROJECT_MANAGER_RANK = 80;

export async function isProjectManager(
  projectId: string,
  workspaceId: string,
  userId: string,
  redis: Redis,
  db: PrismaClient
): Promise<boolean> {
  // Check explicit project role rank — rank-based, supports custom roles
  const projectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: {
      projectRole: {
        select: { rank: true },
      },
    },
  });

  if ((projectMember?.projectRole?.rank ?? 0) >= PROJECT_MANAGER_RANK) return true;

  // Fallback: workspace ADMIN or OWNER can manage all projects
  return isWorkspaceAdminOrAbove(workspaceId, userId, redis, db);
}

export { isProjectMember };
