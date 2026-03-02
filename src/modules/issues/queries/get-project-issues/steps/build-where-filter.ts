import type { PrismaClient, Prisma, IssuePriority } from "@prisma/client";
import type { IssueRow } from "../types";

interface BuildFilterInput {
  projectId: string;
  assigneeId?: string;
  labelIds?: string[];
  priority?: IssuePriority;
}

export function buildWhereFilter(
  input: BuildFilterInput
): Prisma.IssueWhereInput {
  const { projectId, assigneeId, labelIds, priority } = input;

  return {
    projectId,
    deletedAt: null,
    ...(assigneeId && { assigneeId }),
    ...(priority && { priority }),
    ...(labelIds?.length && {
      labels: { some: { labelId: { in: labelIds } } },
    }),
  };
}
