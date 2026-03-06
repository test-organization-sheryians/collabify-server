/** Assert the actor is at least an ADMIN in the workspace. Throws FORBIDDEN if not. */
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

  // rank >= 80 covers ADMIN (80) and OWNER (100)
  if (!member || member.assignedRole.rank < 80) {
    throw AppError.forbidden(
      "Only admins and owners can update workspace settings"
    );
  }
}
