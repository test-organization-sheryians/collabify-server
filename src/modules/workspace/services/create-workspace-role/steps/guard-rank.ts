/**
 * Guard: actor cannot create a role with rank >= their own rank.
 * Prevents privilege escalation — e.g. a MEMBER (rank=50) can't create an ADMIN-level role.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardRank(
  workspaceId: string,
  actorUserId: string,
  targetRank: number,
  db: PrismaClient
) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    select: { assignedRole: { select: { rank: true } } },
  });
  if (!member) throw AppError.notFound("Workspace member not found");
  if (targetRank >= member.assignedRole.rank) {
    throw AppError.forbidden(
      "Cannot create or assign a role with rank equal to or higher than your own"
    );
  }
}
