/** Verify actor is a workspace member. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyActorMembership(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const actorMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
  });

  if (!actorMember) {
    throw AppError.forbidden("NOT_AUTHORIZED");
  }
}
