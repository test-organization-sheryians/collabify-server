/**
 * Step 2 — Set Archived
 *
 * Sets isArchived = true on the target page. Only the target page is updated —
 * descendants are NOT recursively archived (see README improvement plan).
 */

import type { PrismaClient } from "@prisma/client";
import type { Page } from "@prisma/client";

export async function setArchived(
  pageId: string,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: { isArchived: true },
  });
}
