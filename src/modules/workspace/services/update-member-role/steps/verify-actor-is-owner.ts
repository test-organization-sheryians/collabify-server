/** Verify the actor is a workspace OWNER. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyActorIsOwner(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const actorMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    include: { assignedRole: true },
  });

  if (!actorMember || actorMember.assignedRole.name !== "OWNER") {
    throw AppError.forbidden("Only owners can update roles");
  }
}
