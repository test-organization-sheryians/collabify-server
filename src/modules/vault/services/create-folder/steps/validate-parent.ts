import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

/**
 * Validates the target parent folder for folder/file operations.
 * Checks: exists in same project, not deleted, not a system folder.
 */
export async function validateParent(
  parentFolderId: string,
  projectId: string,
  db: PrismaClient
): Promise<void> {
  const parent = await db.vaultFolder.findFirst({
    where: { id: parentFolderId, projectId, deletedAt: null },
  });

  if (!parent) throw AppError.notFound("Parent folder not found");
}
