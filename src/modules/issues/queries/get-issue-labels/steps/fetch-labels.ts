import type { PrismaClient } from "@prisma/client";
import type { IssueLabelRow } from "../types";

export async function fetchLabels(
  projectId: string,
  db: PrismaClient
): Promise<IssueLabelRow[]> {
  return db.issueLabel.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}
