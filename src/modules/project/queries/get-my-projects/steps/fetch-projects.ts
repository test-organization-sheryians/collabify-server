/** Fetch all projects in a workspace, ordered by creation date descending. */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjects(workspaceId: string, db: PrismaClient) {
  return db.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}
