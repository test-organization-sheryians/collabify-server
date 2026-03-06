/** Soft-deletes the label by setting deletedAt = now(). IssueToLabel rows cascade via DB FK. */
import type { PrismaClient } from "@prisma/client";

export async function softDeleteLabel(
  labelId: string,
  db: PrismaClient
): Promise<void> {
  await db.issueLabel.update({
    where: { id: labelId },
    data: { deletedAt: new Date() },
  });
}
