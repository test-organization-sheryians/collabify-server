/**
 * Delete the workspace invite. Throws NOT_FOUND if the invite doesn't exist
 * (already accepted, expired, or ID doesn't match workspace).
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function deleteInvite(
  inviteId: string,
  workspaceId: string,
  db: PrismaClient
): Promise<void> {
  const invite = await db.workspaceInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, workspaceId: true },
  });

  if (!invite || invite.workspaceId !== workspaceId) {
    throw AppError.notFound("Invite not found");
  }

  await db.workspaceInvite.delete({ where: { id: inviteId } });
}
