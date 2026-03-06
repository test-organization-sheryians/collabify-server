/**
 * Fetch the invite, extend its expiry by 7 days, and return the updated invite.
 * Throws NOT_FOUND if the invite doesn't exist or doesn't belong to the workspace.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function refreshInviteExpiry(
  inviteId: string,
  workspaceId: string,
  db: PrismaClient
) {
  const invite = await db.workspaceInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, workspaceId: true, email: true },
  });

  if (!invite || invite.workspaceId !== workspaceId) {
    throw AppError.notFound("Invite not found");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return db.workspaceInvite.update({
    where: { id: inviteId },
    data: { expiresAt },
  });
}
