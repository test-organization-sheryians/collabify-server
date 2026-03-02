/**
 * Atomically:
 *   1. Gets next sequential issue number (SELECT MAX FOR UPDATE)
 *   2. Computes append position in target column
 *   3. Creates the issue + assigns labels — all in one transaction
 */
import type { PrismaClient } from "@prisma/client";
import type { CreateIssueInput } from "../schema";
import type { IssueRow } from "../../../queries/get-project-issues/types";
import { getNextIssueNumber } from "../../../lib/issue-number";

export async function insertIssue(
  input: CreateIssueInput,
  workspaceId: string,
  userId: string,
  db: PrismaClient
): Promise<IssueRow> {
  return db.$transaction(async (tx) => {
    const number = await getNextIssueNumber(input.projectId, tx);

    const lastIssue = await tx.issue.findFirst({
      where: { statusId: input.statusId, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = lastIssue ? lastIssue.position + 1.0 : 1.0;

    const created = await tx.issue.create({
      data: {
        projectId: input.projectId,
        workspaceId,
        number,
        title: input.title,
        statusId: input.statusId,
        priority: input.priority,
        position,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? null,
        createdById: userId,
        ...(input.labelIds.length > 0 && {
          labels: {
            createMany: {
              data: input.labelIds.map((labelId) => ({ labelId })),
            },
          },
        }),
      },
      include: {
        status: true,
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    });
    return created as IssueRow;
  });
}
