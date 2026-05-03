/**
 * Step 3 — Update DB
 *
 * Mirrors the Redis lock state to the DB (isLocked = true, lockedBy = userId).
 * The DB is the persistence layer — it survives Redis restarts/evictions.
 * Redis is the enforcement point (checked by page-update WS handler on hot path).
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function updateDb(
  pageId: string,
  userId: string,
  db: PrismaClient
): Promise<Page> {
  return db.page.update({
    where: { id: pageId },
    data: { isLocked: true, lockedBy: userId },
  });
}
