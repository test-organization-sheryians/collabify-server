/** Soft-deletes the IssueStatus by setting deletedAt = now(). */
import type { PrismaClient } from "@prisma/client";

export async function softDeleteStatus(
  statusId: string,
  db: PrismaClient
): Promise<void> {
  await db.issueStatus.update({
    where: { id: statusId },
    data: { deletedAt: new Date() },
  });
}
