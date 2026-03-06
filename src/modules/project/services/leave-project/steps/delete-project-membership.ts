/** Delete the actor's own project membership. */
import type { PrismaClient } from "@prisma/client";

export async function deleteProjectMembership(
  projectId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  await db.projectMember.delete({
    where: { projectId_userId: { projectId, userId: actorUserId } },
  });
}
