/**
 * Atomically replaces labels (if provided) and patches mutable issue fields.
 * Returns the updated issue with full includes for the GraphQL response.
 */
import type { PrismaClient } from "@prisma/client";
import type { UpdateIssueInput } from "../schema";
import type { IssueRow } from "../../../queries/get-project-issues/types";

export async function updateIssue(
  input: UpdateIssueInput,
  db: PrismaClient
): Promise<IssueRow> {
  return db.$transaction(async (tx) => {
    if (input.labelIds !== undefined) {
      await tx.issueToLabel.deleteMany({ where: { issueId: input.issueId } });
      if (input.labelIds.length > 0) {
        await tx.issueToLabel.createMany({
          data: input.labelIds.map((labelId) => ({
            issueId: input.issueId,
            labelId,
          })),
        });
      }
    }
    const updated = await tx.issue.update({
      where: { id: input.issueId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      },
      include: {
        status: true,
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    });
    return updated as IssueRow;
  });
}
