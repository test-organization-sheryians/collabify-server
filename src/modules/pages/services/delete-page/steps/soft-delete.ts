/**
 * Step 3 — Soft Delete
 *
 * Sets deletedAt = now() on the page record. The page is NOT removed from the
 * DB — all queries guard against deletedAt: null so it becomes invisible
 * immediately. Hard delete / cleanup is a future background job concern.
 */

import type { PrismaClient } from "@prisma/client";

export async function softDelete(
  pageId: string,
  db: PrismaClient
): Promise<void> {
  await db.page.update({
    where: { id: pageId },
    data: { deletedAt: new Date() },
  });
}
