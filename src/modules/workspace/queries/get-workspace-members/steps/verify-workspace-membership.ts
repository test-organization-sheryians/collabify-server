/** Verify the caller is a member of the workspace. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyWorkspaceMembership(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    select: { id: true },
  });

  if (!membership) {
    throw AppError.forbidden("You are not a member of this workspace");
  }
}
