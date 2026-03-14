/** Fetch all workspace-scoped roles (system + custom) for the given workspace. */
import type { PrismaClient } from "@prisma/client";

export async function fetchWorkspaceRoles(workspaceId: string, db: PrismaClient) {
  const roles = await db.role.findMany({
    where: {
      workspaceId,
      projectId: null,       // workspace-wide only, not project-specific
      scopeType: "WORKSPACE",
    },
    orderBy: [{ isSystem: "desc" }, { rank: "desc" }],
  });

  // Serialize Date fields — GraphQL SDL uses String! for timestamps
  return roles.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

