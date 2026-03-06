/** Verify the actor is a member of the workspace before loading it. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyWorkspaceMembership(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    select: { id: true },
  });
  if (!member) throw AppError.forbidden("Not a member of this workspace");
}
