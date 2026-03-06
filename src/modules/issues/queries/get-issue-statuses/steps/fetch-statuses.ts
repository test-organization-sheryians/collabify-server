import type { PrismaClient } from "@prisma/client";
import type { IssueStatusRow } from "../types";

export async function fetchStatuses(
  projectId: string,
  db: PrismaClient
): Promise<IssueStatusRow[]> {
  return db.issueStatus.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { position: "asc" },
  });
}
