import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function validateTargetFolder(
  targetFolderId: string | null | undefined,
  projectId: string,
  db: PrismaClient
): Promise<void> {
  if (!targetFolderId) return; // moving to root is always valid

  const folder = await db.vaultFolder.findFirst({
    where: { id: targetFolderId, projectId, deletedAt: null },
  });

  if (!folder)
    throw AppError.notFound("Target folder not found in this project");
}
