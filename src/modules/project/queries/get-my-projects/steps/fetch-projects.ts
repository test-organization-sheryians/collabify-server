/**
 * Fetch projects in a workspace for a given user.
 *
 * - Workspace admins/owners (isAdmin=true): return all projects.
 * - Regular members: return only projects they are a member of.
 */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjects(
  workspaceId: string,
  userId: string,
  isAdmin: boolean,
  db: PrismaClient
) {
  return db.project.findMany({
    where: {
      workspaceId,
      ...(isAdmin ? {} : { members: { some: { userId } } }),
    },
    orderBy: { createdAt: "desc" },
  });
}
