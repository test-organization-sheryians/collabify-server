/** Delete the project member row. Throws NOT_FOUND if target is not a project member. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function deleteProjectMember(
  projectId: string,
  targetUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { id: true },
  });
  if (!member) {
    throw AppError.notFound("User is not a member of this project");
  }

  await db.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
}
