/** Verify actor is a member of the project before they can leave. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyIsMember(
  projectId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorUserId } },
    select: { id: true },
  });

  if (!member) {
    throw AppError.notFound("You are not a member of this project");
  }
}
