import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function insertRole(
  workspaceId: string,
  name: string,
  rank: number,
  description: string | undefined,
  db: PrismaClient
) {
  // Guard: no duplicate name at workspace scope (projectId=null)
  const existing = await db.role.findFirst({
    where: { workspaceId, projectId: null, name },
    select: { id: true },
  });
  if (existing) {
    throw AppError.conflict(`A role named "${name}" already exists in this workspace`);
  }

  return db.role.create({
    data: {
      workspaceId,
      projectId: null,
      name,
      description,
      rank,
      scopeType: "WORKSPACE",
      isSystem: false,
    },
  });
}
