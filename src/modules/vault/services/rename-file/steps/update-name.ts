import type { PrismaClient, VaultFile } from "@prisma/client";

export async function updateFileName(
  fileId: string,
  name: string,
  db: PrismaClient
): Promise<VaultFile> {
  return db.vaultFile.update({ where: { id: fileId }, data: { name } });
}
