/**
 * Validates that all `labelIds` belong to `projectId` and are not deleted.
 * No-op if `labelIds` is empty.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function validateLabels(
  labelIds: string[],
  projectId: string,
  db: PrismaClient
): Promise<void> {
  if (labelIds.length === 0) return;
  const count = await db.issueLabel.count({
    where: { id: { in: labelIds }, projectId, deletedAt: null },
  });
  if (count !== labelIds.length) {
    throw AppError.badRequest(
      "One or more labels do not belong to this project."
    );
  }
}
