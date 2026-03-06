/** Fetch all members of a project with their user profiles. */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjectMembers(projectId: string, db: PrismaClient) {
  return db.projectMember.findMany({
    where: { projectId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });
}
