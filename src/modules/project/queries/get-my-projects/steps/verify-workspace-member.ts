/** Verify the caller is a member of the workspace. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyWorkspaceMember(
  workspaceId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { id: true },
  });

  if (!member) {
    throw AppError.forbidden("User is not a member of this workspace");
  }
}
