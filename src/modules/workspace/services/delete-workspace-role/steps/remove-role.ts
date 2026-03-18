import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function removeRole(
  roleId: string,
  workspaceId: string,
  db: PrismaClient
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: {
      isSystem: true,
      workspaceId: true,
      _count: { select: { workspaceMembers: true, projectMembers: true } },
    },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.workspaceId !== workspaceId) throw AppError.forbidden("Role does not belong to this workspace");
  if (role.isSystem) throw AppError.forbidden("System roles cannot be deleted");

  const totalAssigned = role._count.workspaceMembers + role._count.projectMembers;
  if (totalAssigned > 0) {
    throw AppError.conflict(
      `Cannot delete role: ${totalAssigned} member(s) are currently assigned to it. Reassign them first.`
    );
  }

  await db.role.delete({ where: { id: roleId } });
  return true;
}
