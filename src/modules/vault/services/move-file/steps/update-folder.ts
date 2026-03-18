import type { PrismaClient, VaultFile } from "@prisma/client";

export async function updateFileFolder(
  fileId: string,
  targetFolderId: string | null | undefined,
  db: PrismaClient
): Promise<VaultFile> {
  return db.vaultFile.update({
    where: { id: fileId },
    data: { folderId: targetFolderId ?? null },
  });
}
