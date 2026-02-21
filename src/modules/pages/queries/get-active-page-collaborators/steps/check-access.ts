/**
 * Step 1 — Check Access
 *
 * Verifies the requesting user is a page collaborator.
 * Access gate: only existing collaborators can query live presence.
 * Workspace-member-only users cannot see who is actively editing a page.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkAccess(
  pageId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  const collab = await db.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
    select: { id: true },
  });

  if (!collab) {
    throw AppError.forbidden("Not a collaborator on this page");
  }
}
