/** Loads issue (id, projectId, workspaceId) and throws NOT_FOUND if missing or deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type IssueForUpload = {
  id: string;
  projectId: string;
  workspaceId: string;
};

export async function fetchIssue(
  issueId: string,
  db: PrismaClient
): Promise<IssueForUpload> {
  const issue = await db.issue.findUnique({
    where: { id: issueId, deletedAt: null },
    select: { id: true, projectId: true, workspaceId: true },
  });
  if (!issue) throw AppError.notFound("Issue not found.");
  return issue;
}
