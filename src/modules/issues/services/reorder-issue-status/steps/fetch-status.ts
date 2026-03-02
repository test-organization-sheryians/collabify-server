/** Loads IssueStatus (id, projectId) lean and throws NOT_FOUND if missing or deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type LeanStatus = { id: string; projectId: string };

export async function fetchStatus(
  statusId: string,
  db: PrismaClient
): Promise<LeanStatus> {
  const status = await db.issueStatus.findUnique({
    where: { id: statusId, deletedAt: null },
    select: { id: true, projectId: true },
  });
  if (!status) throw AppError.notFound("Status not found.");
  return status;
}
