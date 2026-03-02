import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type LeanIssueForDescription = {
  id: string;
  projectId: string;
  descriptionS3Key: string | null;
};

export async function fetchIssueForDescription(
  issueId: string,
  db: PrismaClient
): Promise<LeanIssueForDescription> {
  const issue = await db.issue.findUnique({
    where: { id: issueId, deletedAt: null },
    select: { id: true, projectId: true, descriptionS3Key: true },
  });

  if (!issue) {
    throw AppError.notFound("Issue not found.");
  }

  return issue;
}
