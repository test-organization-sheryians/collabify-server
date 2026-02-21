/**
 * Step 1 — Check Access
 *
 * Verifies the requesting user is an existing page collaborator.
 * Only collaborators may see the full collaborator list — workspace-member-only
 * users cannot enumerate who has access to a page they haven't been invited to.
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

  if (!collab) throw AppError.forbidden("Not a collaborator on this page");
}
