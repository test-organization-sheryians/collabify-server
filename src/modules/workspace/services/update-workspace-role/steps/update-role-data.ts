import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface RoleUpdates {
  name?: string;
  description?: string;
  rank?: number;
}

export async function updateRoleData(
  roleId: string,
  workspaceId: string,
  actorUserId: string,
  updates: RoleUpdates,
  db: PrismaClient
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true, rank: true, workspaceId: true },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.workspaceId !== workspaceId) throw AppError.forbidden("Role does not belong to this workspace");
  if (role.isSystem) throw AppError.forbidden("System roles cannot be modified");

  // Rank escalation guard — actor cannot raise a role to or above their own rank
  if (updates.rank !== undefined) {
    const actor = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
      select: { assignedRole: { select: { rank: true } } },
    });
    if (!actor) throw AppError.notFound("Actor workspace membership not found");
    if (updates.rank >= actor.assignedRole.rank) {
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
