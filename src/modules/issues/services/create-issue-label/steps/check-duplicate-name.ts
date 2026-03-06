/** Throws CONFLICT if a label with the same name already exists in the project (case-sensitive). */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkDuplicateName(
  name: string,
  projectId: string,
  db: PrismaClient
): Promise<void> {
  const existing = await db.issueLabel.findFirst({
    where: { projectId, name, deletedAt: null },
    select: { id: true },
  });
  if (existing)
    throw AppError.conflict(
      "A label with this name already exists in the project."
    );
}
