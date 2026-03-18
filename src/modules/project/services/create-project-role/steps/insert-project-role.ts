/** Duplicate-name guard then create the project-scoped Role row. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function insertProjectRole(
  projectId: string,
  workspaceId: string,
  name: string,
  rank: number,
  description: string | undefined,
  db: PrismaClient
) {
  const existing = await db.role.findFirst({
    where: { workspaceId, projectId, name },
    select: { id: true },
  });
  if (existing) {
    throw AppError.conflict(`A role named "${name}" already exists in this project`);
  }

  return db.role.create({
    data: {
      workspaceId,
      projectId,
      name,
      description,
      rank,
      scopeType: "PROJECT",
      isSystem: false,
    },
  });
}
