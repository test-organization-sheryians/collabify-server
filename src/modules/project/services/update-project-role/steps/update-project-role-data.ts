import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface RoleUpdates {
  name?: string;
  description?: string;
  rank?: number;
}

export async function updateProjectRoleData(
  roleId: string,
  projectId: string,
  workspaceId: string,
  actorUserId: string,
  updates: RoleUpdates,
  db: PrismaClient
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true, projectId: true, workspaceId: true },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.projectId !== projectId || role.workspaceId !== workspaceId) {
    throw AppError.forbidden("Role does not belong to this project");
  }
  if (role.isSystem) throw AppError.forbidden("System roles cannot be modified");

  // Rank escalation guard
  if (updates.rank !== undefined) {
    const actor = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorUserId } },
      select: { projectRole: { select: { rank: true } } },
    });
    if (!actor) throw AppError.notFound("Actor project membership not found");
    // If actor has no project-specific role, skip rank check
    if (actor.projectRole && updates.rank >= actor.projectRole.rank) {
      throw AppError.forbidden("Cannot set rank equal to or higher than your own");
    }
  }

  return db.role.update({
    where: { id: roleId },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.rank !== undefined && { rank: updates.rank }),
    },
  });
}
