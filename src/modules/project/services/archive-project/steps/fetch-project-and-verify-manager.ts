/**
 * Fetch the project's workspaceId, assert actor has manager permissions.
 * Shared guard used across archive, unarchive, delete.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function fetchProjectAndVerifyManager(
  projectId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<{ workspaceId: string }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) throw AppError.notFound("Project not found");

  // Check workspace-level role
  const workspaceMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: project.workspaceId,
        userId: actorUserId,
      },
    },
    include: { assignedRole: true },
  });

  if (!workspaceMember) throw AppError.forbidden("Not a workspace member");

  if (workspaceMember.assignedRole.rank >= 80) return project;

  // Fall back to project-level role
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

  return project;
}
