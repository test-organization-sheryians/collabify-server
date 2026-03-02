import { AppError } from "@/shared/errors";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { IssueRow } from "../types";

const INCLUDE = {
  status: true,
  assignee: { select: { id: true, fullName: true, avatarUrl: true } },
  createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
  labels: { include: { label: true } },
} satisfies Prisma.IssueInclude;

export async function fetchIssue(
  issueId: string,
  db: PrismaClient
): Promise<IssueRow> {
  const issue = await db.issue.findUnique({
    where: { id: issueId, deletedAt: null },
    include: INCLUDE,
  });

  if (!issue) {
    throw AppError.notFound("Issue not found.");
  }

  return issue as IssueRow;
}
