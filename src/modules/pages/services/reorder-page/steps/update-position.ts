/**
 * Step 3 — Update Position
 *
 * Persists the new parent and position to the DB.
 * newParentId = null moves the page to root level.
 * newPosition uses fractional indexing — no sibling re-numbering required.
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function updatePosition(
  pageId: string,
  newParentId: string | null | undefined,
  newPosition: number,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: {
      parentPageId: newParentId ?? null,
      position: newPosition,
    },
  });
}
