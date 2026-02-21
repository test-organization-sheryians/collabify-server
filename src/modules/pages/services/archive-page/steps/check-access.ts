/**
 * Step 1 — Check Access
 *
 * Fetches the page (soft-delete guard) and verifies the caller is an EDITOR.
 * Returns the page so the handler can pass pageId to downstream steps without
 * a second DB lookup.
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
    throw AppError.forbidden("Only editors can archive a page");
  }
}
