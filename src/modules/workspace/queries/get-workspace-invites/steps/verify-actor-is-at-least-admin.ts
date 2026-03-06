/** Verify actor is at least ADMIN before listing invites. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyActorIsAtLeastAdmin(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    include: { assignedRole: true },
  });

  if (!member || member.assignedRole.rank < 80) {
    throw AppError.forbidden("Only admins and owners can view invites");
  }
}
