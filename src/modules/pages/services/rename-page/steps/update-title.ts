/**
 * Step 2 — Update Title
 *
 * Updates the page title in the DB. Returns the full updated page record
 * for the resolver.
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function updateTitle(
  pageId: string,
  title: string,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: { title },
  });
}
