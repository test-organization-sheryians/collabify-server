/**
 * Fetch both the actor member and the target member records.
 * Throws NOT_FOUND if the target member does not exist.
 * Includes assignedRole so downstream steps can check role name/rank.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function fetchMembers(
  workspaceId: string,
  memberId: string,
  actorUserId: string,
  db: PrismaClient
) {
  const [actorMember, targetMember] = await Promise.all([
    db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
      include: { assignedRole: true },
    }),
    db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
      include: { assignedRole: true },
    }),
  ]);

  if (!targetMember) {
    throw AppError.notFound("Member not found");
  }

  return { actorMember, targetMember };
}
