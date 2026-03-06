import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

/**
 * Verifies the calling user is a member of the project.
 * Returns the projectId for use in subsequent steps.
 */
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
