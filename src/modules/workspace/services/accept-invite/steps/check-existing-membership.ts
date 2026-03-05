/**
 * Check if user is already a workspace member.
 * If they are, delete the invite and return an early success result.
 * Returns null if the user is NOT yet a member (normal path continues).
 */
import type { PrismaClient } from "@prisma/client";

type EarlyResult = {
  success: true;
  message: string;
  workspaceSlug: string;
} | null;

export async function checkExistingMembership(
  workspaceId: string,
  userId: string,
  token: string,
  db: PrismaClient
): Promise<EarlyResult> {
  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (existing) {
    await db.workspaceInvite.delete({ where: { token } });
    return {
      success: true,
      message: "You are already a member.",
      workspaceSlug: "unknown",
    };
  }

  return null;
}
