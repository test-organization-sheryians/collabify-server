import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFolder } from "@prisma/client";

/**
 * Shared step used by rename-folder, delete-folder, move-folder.
 * Guards against: not found, already deleted, system folder.
 */
export async function fetchEditableFolder(
  folderId: string,
  db: PrismaClient
): Promise<VaultFolder> {
  const folder = await db.vaultFolder.findFirst({
    where: { id: folderId, deletedAt: null },
  });

  if (!folder) throw AppError.notFound("Folder not found");

  if (folder.isSystem) {
    throw AppError.forbidden("System folders cannot be modified");
  }

  return folder;
}
