/** Sets `deletedAt = now()` on the issue (soft delete). */
import type { PrismaClient } from "@prisma/client";

export async function softDeleteIssue(
  issueId: string,
  db: PrismaClient
): Promise<void> {
  await db.issue.update({
    where: { id: issueId },
    data: { deletedAt: new Date() },
  });
}
