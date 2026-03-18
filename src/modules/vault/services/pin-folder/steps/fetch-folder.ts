import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function fetchFolderForPin(
  folderId: string,
  projectId: string,
  db: PrismaClient
): Promise<VaultFolder> {
  const folder = await db.vaultFolder.findFirst({
    where: { id: folderId, projectId, deletedAt: null },
  });

  if (!folder) throw AppError.notFound("Folder not found in this project");

  return folder;
}
