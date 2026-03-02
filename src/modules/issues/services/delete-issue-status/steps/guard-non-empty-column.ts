/** Throws CONFLICT if the column still has active (non-deleted) issues. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardNonEmptyColumn(
  statusId: string,
  db: PrismaClient
): Promise<void> {
  const count = await db.issue.count({
    where: { statusId, deletedAt: null },
  });
  if (count > 0) {
    throw AppError.conflict(
      "Cannot delete a column that still has active issues. Move them first."
    );
  }
}
