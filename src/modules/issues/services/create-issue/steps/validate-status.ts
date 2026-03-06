/** Validates that `statusId` exists within `projectId` and is not deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function validateStatus(
  statusId: string,
  projectId: string,
  db: PrismaClient
): Promise<void> {
  const status = await db.issueStatus.findFirst({
    where: { id: statusId, projectId, deletedAt: null },
    select: { id: true },
  });
  if (!status) throw AppError.notFound("Status not found in this project.");
}
