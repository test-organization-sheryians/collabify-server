/** Soft-delete the workspace by setting deletedAt. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function softDeleteWorkspace(
  workspaceId: string,
  db: PrismaClient
): Promise<void> {
  try {
    await db.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
  } catch {
    throw AppError.notFound("Workspace not found");
  }
}
