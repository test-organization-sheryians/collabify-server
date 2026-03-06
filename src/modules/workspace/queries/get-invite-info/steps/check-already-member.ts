/**
 * If the caller's userId is known, check they are not already a member.
 * Throws CONFLICT if they are already a member of the workspace.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkAlreadyMember(
  workspaceId: string,
  userId: string | undefined,
  db: PrismaClient
): Promise<void> {
  if (!userId) return;

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });

  if (member) {
    throw AppError.conflict("ALREADY_MEMBER");
  }
}
