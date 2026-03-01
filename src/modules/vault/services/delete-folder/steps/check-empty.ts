import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkFolderEmpty(
  folderId: string,
  db: PrismaClient
): Promise<void> {
  const [childFolderCount, fileCount] = await Promise.all([
    db.vaultFolder.count({
      where: { parentFolderId: folderId, deletedAt: null },
    }),
    db.vaultFile.count({
      where: { folderId, status: "ACTIVE", deletedAt: null },
    }),
  ]);

  if (childFolderCount > 0 || fileCount > 0) {
    throw AppError.conflict(
      "Folder is not empty. Use cascade=true to delete with all contents."
    );
  }
}
