/** Updates the issue's fractional position within its current column. Returns updated IssueRow. */
import type { PrismaClient } from "@prisma/client";
import type { ReorderIssueInput } from "../schema";
import type { IssueRow } from "../../../queries/get-project-issues/types";

export async function updatePosition(
  input: ReorderIssueInput,
  db: PrismaClient
): Promise<IssueRow> {
  const updated = await db.issue.update({
    where: { id: input.issueId },
    data: { position: input.newPosition },
    include: {
      status: true,
      assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      labels: { include: { label: true } },
    },
  });
  return updated as IssueRow;
}
