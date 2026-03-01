import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function updateFolderParent(
  folderId: string,
  targetParentFolderId: string | null | undefined,
  db: PrismaClient
): Promise<VaultFolder> {
  return db.vaultFolder.update({
    where: { id: folderId },
    data: { parentFolderId: targetParentFolderId ?? null },
  });
}
