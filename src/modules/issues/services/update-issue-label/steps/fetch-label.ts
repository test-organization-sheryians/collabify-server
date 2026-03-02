/** Loads IssueLabel (id, projectId) and throws NOT_FOUND if missing or deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type LeanLabel = { id: string; projectId: string };

export async function fetchLabel(
  labelId: string,
  db: PrismaClient
): Promise<LeanLabel> {
  const label = await db.issueLabel.findUnique({
    where: { id: labelId, deletedAt: null },
    select: { id: true, projectId: true },
  });
  if (!label) throw AppError.notFound("Label not found.");
  return label;
}
