/** Delete a workspace member and cascade-remove all their project memberships in that workspace. */
import type { PrismaClient } from "@prisma/client";

export async function deleteMember(
  memberId: string,
  workspaceId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  await db.$transaction([
    // Remove all project memberships in this workspace first
    db.projectMember.deleteMany({ where: { workspaceId, userId } }),
    // Then remove workspace membership
    db.workspaceMember.delete({ where: { id: memberId } }),
  ]);
}

