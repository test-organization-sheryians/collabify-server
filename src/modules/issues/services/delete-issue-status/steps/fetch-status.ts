/** Loads IssueStatus (id, projectId, isSystem) and throws NOT_FOUND if missing or deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type LeanStatusWithSystem = {
  id: string;
  projectId: string;
  isSystem: boolean;
};

export async function fetchStatus(
  statusId: string,
  db: PrismaClient
): Promise<LeanStatusWithSystem> {
  const status = await db.issueStatus.findUnique({
    where: { id: statusId, deletedAt: null },
    select: { id: true, projectId: true, isSystem: true },
  });
  if (!status) throw AppError.notFound("Status not found.");
  return status;
}
