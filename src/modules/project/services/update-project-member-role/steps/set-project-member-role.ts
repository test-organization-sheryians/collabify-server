/** Update the project role of a member. Throws NOT_FOUND if member or role missing. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function setProjectMemberRole(
  projectId: string,
  targetUserId: string,
  roleId: string,
  db: PrismaClient
) {
  // Verify role exists
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { id: true },
  });
  if (!role) throw AppError.notFound("Role not found");

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { id: true },
  });
  if (!member) throw AppError.notFound("User is not a member of this project");

  return db.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { projectRoleId: roleId },
    include: {
      user: true,
      projectRole: { select: { id: true, name: true } },
    },
  });
}
