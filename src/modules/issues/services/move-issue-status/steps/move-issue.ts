/**
 * Updates the issue's statusId and position (drag card to new column).
 * Returns the full issue row for GraphQL.
 */
import type { PrismaClient } from "@prisma/client";
import type { MoveIssueStatusInput } from "../schema";
import type { IssueRow } from "../../../queries/get-project-issues/types";

export async function moveIssue(
  input: MoveIssueStatusInput,
  db: PrismaClient
): Promise<IssueRow> {
  const updated = await db.issue.update({
    where: { id: input.issueId },
    data: { statusId: input.statusId, position: input.newPosition },
    include: {
      status: true,
      assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      labels: { include: { label: true } },
    },
  });
  return updated as IssueRow;
}
