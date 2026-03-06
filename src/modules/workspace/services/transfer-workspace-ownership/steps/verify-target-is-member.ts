/**
 * Verify new owner is a workspace member.
 * Throws NOT_FOUND if the target user is not a member.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyTargetIsMember(
  workspaceId: string,
  newOwnerId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
    select: { id: true },
  });

  if (!member) {
    throw AppError.notFound("Target user is not a member of this workspace");
  }
}
