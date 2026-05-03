/** Fetch all PROJECT-scoped roles for a given project. */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjectRoles(
  projectId: string,
  workspaceId: string,
  db: PrismaClient
) {
  const roles = await db.role.findMany({
    where: { workspaceId, projectId, scopeType: "PROJECT" },
    orderBy: [{ isSystem: "desc" }, { rank: "desc" }],
  });

  // Serialize Date fields — GraphQL SDL uses String! for timestamps
  return roles.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
