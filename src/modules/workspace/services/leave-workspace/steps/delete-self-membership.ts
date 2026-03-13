/** Delete the actor's own workspace membership and all their project memberships in that workspace. */
import type { PrismaClient } from "@prisma/client";

export async function deleteSelfMembership(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  await db.$transaction([
    // Remove all project memberships in this workspace first
    db.projectMember.deleteMany({ where: { workspaceId, userId: actorUserId } }),
    // Then remove workspace membership
    db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    }),
  ]);
}

