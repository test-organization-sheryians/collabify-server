import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function updateFolderName(
  folderId: string,
  name: string,
  db: PrismaClient
): Promise<VaultFolder> {
  return db.vaultFolder.update({ where: { id: folderId }, data: { name } });
}
