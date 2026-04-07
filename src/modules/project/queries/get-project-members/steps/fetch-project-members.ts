/**
 * Fetch all project members with user profile and their assigned project role name.
 *
 * Includes projectRole so the GQL resolver can map role → projectRole.name.
 * joinedAt is returned as-is (Date) — the ProjectMember field resolver serializes it to ISO string.
 */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjectMembers(projectId: string, db: PrismaClient) {
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: {
      user: true,
      projectRole: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => ({
    ...m,
    role: m.projectRole?.name ?? null,
    roleId: m.projectRole?.id ?? null,
  }));
}
