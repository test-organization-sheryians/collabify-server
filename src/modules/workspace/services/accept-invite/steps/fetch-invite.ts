/** Fetch a workspace invite by token. Throws NOT_FOUND if missing or expired. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function fetchInvite(token: string, db: PrismaClient) {
  const invite = await db.workspaceInvite.findUnique({ where: { token } });

  if (!invite || invite.expiresAt < new Date()) {
    throw AppError.notFound("INVITE_EXPIRED");
  }

  return invite;
}
