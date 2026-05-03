/**
 * Step 3 — Set Unarchived
 *
 * Sets isArchived = false on the target page.
 * Only the target page is restored — descendants remain archived
 * (see README improvement plan for cascade-unarchive consideration).
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function setUnarchived(
  pageId: string,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: { isArchived: false },
  });
}
