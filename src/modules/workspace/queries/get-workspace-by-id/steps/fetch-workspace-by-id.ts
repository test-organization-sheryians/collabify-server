/** Fetch workspace by ID. Throws NOT_FOUND if it doesn't exist or is deleted. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function fetchWorkspaceById(
  workspaceId: string,
  db: PrismaClient
) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId, deletedAt: null },
  });
  if (!workspace) throw AppError.notFound("Workspace not found");
  return workspace;
}
