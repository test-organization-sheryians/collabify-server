/**
 * Resolve the role by ID in the workspace and update the member's roleId.
 * Returns the updated member including user, role name, roleId, and roleRank.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function updateRole(
  memberId: string,
  workspaceId: string,
  roleId: string,
  db: PrismaClient
) {
  // Verify the role belongs to this workspace
  const role = await db.role.findFirst({
    where: { id: roleId, workspaceId, projectId: null },
  });

  if (!role) {
    throw AppError.notFound(`Role not found in workspace`);
  }

  const updated = await db.workspaceMember.update({
    where: { id: memberId, workspaceId },
    data: { roleId: role.id },
    include: { user: true, assignedRole: true },
  });

  return {
    ...updated,
    role: updated.assignedRole.name,
    roleId: updated.assignedRole.id,
    roleRank: updated.assignedRole.rank,
  };
}

