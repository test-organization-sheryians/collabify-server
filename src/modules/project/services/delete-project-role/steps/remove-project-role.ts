import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function removeProjectRole(
  roleId: string,
  projectId: string,
  workspaceId: string,
  db: PrismaClient
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: {
      isSystem: true,
      projectId: true,
      workspaceId: true,
      _count: { select: { projectMembers: true } },
    },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.projectId !== projectId || role.workspaceId !== workspaceId) {
    throw AppError.forbidden("Role does not belong to this project");
  }
  if (role.isSystem) throw AppError.forbidden("System roles cannot be deleted");
  if (role._count.projectMembers > 0) {
    throw AppError.conflict(
      `Cannot delete: ${role._count.projectMembers} member(s) still assigned to this role. Reassign them first.`
    );
  }

  await db.role.delete({ where: { id: roleId } });
  return true;
}
