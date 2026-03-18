/**
 * Resolve the named role in the workspace and update the member's roleId.
 * Returns the updated member including user and role.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function updateRole(
  memberId: string,
  workspaceId: string,
  roleName: string,
  db: PrismaClient
) {
  const role = await db.role.findFirst({
    where: { workspaceId, projectId: null, name: roleName },
  });

  if (!role) {
    throw AppError.notFound(`Role "${roleName}" not found in workspace`);
  }

  return db.workspaceMember.update({
    where: { id: memberId, workspaceId },
    data: { roleId: role.id },
    include: { user: true, assignedRole: true },
  });
}
