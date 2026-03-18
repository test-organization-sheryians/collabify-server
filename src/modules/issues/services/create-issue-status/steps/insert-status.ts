/** Creates a new IssueStatus row, appending after the last existing position. */
import type { PrismaClient, IssueStatus } from "@prisma/client";
import type { CreateIssueStatusInput } from "../schema";

export async function insertStatus(
  input: CreateIssueStatusInput,
  db: PrismaClient
): Promise<IssueStatus> {
  const last = await db.issueStatus.findFirst({
    where: { projectId: input.projectId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = last ? last.position + 1.0 : 1.0;

  return db.issueStatus.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      color: input.color,
      icon: input.icon ?? null,
      position,
      isSystem: false,
    },
  });
}
