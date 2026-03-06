/** Delete the actor's own workspace membership. */
import type { PrismaClient } from "@prisma/client";

export async function deleteSelfMembership(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
  });
}
