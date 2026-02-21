/**
 * Step 3 — Delete Collaborator
 *
 * Removes the pageCollaborator record. No soft-delete — the collaborator
 * record is hard-deleted since removal is an explicit user action.
 * Any active Redis ZSET presence entry for the removed user will expire
 * naturally on next TTL tick or unsubscribe-page event.
 */

import type { PrismaClient } from "@prisma/client";

export async function deleteCollaborator(
  pageId: string,
  targetUserId: string,
  db: PrismaClient
): Promise<void> {
  await db.pageCollaborator.delete({
    where: { pageId_userId: { pageId, userId: targetUserId } },
  });
}
