/**
 * Fetch and validate a workspace invite by token (including workspace details).
 * Throws NOT_FOUND if token is missing or expired.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function fetchInvite(token: string, db: PrismaClient) {
  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { name: true, logoS3Key: true } },
    },
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw AppError.notFound("INVITE_EXPIRED");
  }

  return invite;
}
