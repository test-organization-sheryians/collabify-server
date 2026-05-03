import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";
import type { FolderNode } from "../types";

export async function fetchFolderNode(
  id: string,
  db: PrismaClient
): Promise<FolderNode> {
  const folder = await db.vaultFolder.findFirst({
    where: { id, deletedAt: null },
  });

  if (!folder) throw AppError.notFound("Folder not found");

  const [childFolderCount, fileCount] = await Promise.all([
    db.vaultFolder.count({ where: { parentFolderId: id, deletedAt: null } }),
    db.vaultFile.count({
      where: { folderId: id, status: "ACTIVE", deletedAt: null },
    }),
  ]);

  return { ...folder, childFolderCount, fileCount };
}
