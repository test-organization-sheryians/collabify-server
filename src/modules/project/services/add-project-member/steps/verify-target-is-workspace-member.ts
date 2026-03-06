/** Verify the target user is a workspace member (required before adding to a project). */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyTargetIsWorkspaceMember(
  workspaceId: string,
  targetUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    select: { id: true },
  });
  if (!member) {
    throw AppError.badRequest("User is not a member of this workspace");
  }
}
