import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyProjectMember(
  projectId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });

  if (!member) {
    throw AppError.forbidden("You are not a member of this project.");
  }
}
