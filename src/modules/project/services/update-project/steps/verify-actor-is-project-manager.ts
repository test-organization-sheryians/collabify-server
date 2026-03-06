/**
 * Verify the actor is a project manager (workspace OWNER/ADMIN or project member with rank >= 80).
 * Falls back to workspace role if no project-specific role is set.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyActorIsProjectManager(
  projectId: string,
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  // Check workspace-level role first (OWNER/ADMIN can always manage projects)
  const workspaceMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    include: { assignedRole: true },
  });

  if (!workspaceMember) {
    throw AppError.forbidden("Not a workspace member");
  }

  // Workspace ADMIN/OWNER bypass project-level checks (rank >= 80)
  if (workspaceMember.assignedRole.rank >= 80) return;

  // Otherwise check project-level role
  const projectMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorUserId } },
    include: { projectRole: true },
  });

  if (
    !projectMember ||
    !projectMember.projectRole ||
    projectMember.projectRole.rank < 80
  ) {
    throw AppError.forbidden("Insufficient permissions to manage this project");
  }
}
