/** Assert actor is a member OR workspace ADMIN/OWNER, granting access to project members list. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyProjectAccess(
  projectId: string,
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const isMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorUserId } },
    select: { id: true },
  });
  if (isMember) return;

  const workspaceMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    include: { assignedRole: true },
  });
  if (workspaceMember && workspaceMember.assignedRole.rank >= 80) return;

  throw AppError.forbidden("Access denied to this project");
}
