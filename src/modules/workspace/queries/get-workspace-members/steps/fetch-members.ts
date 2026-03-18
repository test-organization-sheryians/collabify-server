/** Fetch all workspace members including their user profile, ordered by join date. */
import type { PrismaClient } from "@prisma/client";

export async function fetchMembers(workspaceId: string, db: PrismaClient) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true, assignedRole: true },
    orderBy: { joinedAt: "desc" },
  });
}
