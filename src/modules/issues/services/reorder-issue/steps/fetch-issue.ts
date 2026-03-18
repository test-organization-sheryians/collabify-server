/** Loads issue lean and throws NOT_FOUND if missing or deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type LeanIssue = { id: string; projectId: string };

export async function fetchIssue(
  issueId: string,
  db: PrismaClient
): Promise<LeanIssue> {
  const issue = await db.issue.findUnique({
    where: { id: issueId, deletedAt: null },
    select: { id: true, projectId: true },
  });
  if (!issue) throw AppError.notFound("Issue not found.");
  return issue;
}
