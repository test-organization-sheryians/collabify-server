/**
 * Guard: actor cannot create a project role with rank >= their own project rank.
 * Prevents privilege escalation within project scope.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardProjectRank(
  projectId: string,
  actorUserId: string,
  targetRank: number,
  db: PrismaClient
) {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorUserId } },
    select: { projectRole: { select: { rank: true } } },
  });
  if (!member) throw AppError.notFound("Project member not found");
  // If actor has no project-specific role, fall back — no rank restriction at project level
  if (!member.projectRole) return;
  if (targetRank >= member.projectRole.rank) {
    throw AppError.forbidden(
      "Cannot create a role with rank equal to or higher than your own"
    );
  }
}
