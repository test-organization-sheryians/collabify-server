import type { PrismaClient, Prisma } from "@prisma/client";
import type { IssueRow } from "../types";

const INCLUDE = {
  status: true,
  assignee: { select: { id: true, fullName: true, avatarUrl: true } },
  createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
  labels: { include: { label: true } },
} satisfies Prisma.IssueInclude;

export async function fetchIssues(
  where: Prisma.IssueWhereInput,
  db: PrismaClient
): Promise<IssueRow[]> {
  return db.issue.findMany({
    where,
    include: INCLUDE,
    // Primary: priority enum ascending (URGENT=0 … NO_PRIORITY=4)
    // Secondary: fractional position within same priority tier
    orderBy: [{ priority: "asc" }, { position: "asc" }],
  }) as Promise<IssueRow[]>;
}
