/** Verify the actor is a workspace OWNER. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";
import { RoleType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function verifyActorIsOwner(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const actorMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
  });

  if (!actorMember || actorMember.role !== RoleType.OWNER) {
    throw AppError.forbidden("Only owners can update roles");
  }
}
