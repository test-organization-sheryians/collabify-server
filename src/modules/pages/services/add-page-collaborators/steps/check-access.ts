/**
 * Step 1 — Check Access
 *
 * Verifies the calling user is an EDITOR on the page.
 * Only EDITORs can manage collaborators (add or change roles).
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkAccess(
  pageId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  const page = await db.page.findUnique({
    where: { id: pageId, deletedAt: null },
    select: { id: true },
  });
  if (!page) throw AppError.notFound("Page not found");

  const collab = await db.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
    select: { role: true },
  });
  if (!collab || collab.role !== "EDITOR") {
    throw AppError.forbidden("Only editors can manage collaborators");
  }
}
