/**
 * Step 3 — Update DB
 *
 * Mirrors the Redis lock release to the DB (isLocked = false, lockedBy = null).
 * The DB record is the persistence layer — it survives Redis restarts.
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function updateDb(
  pageId: string,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: { isLocked: false, lockedBy: null },
  });
}
