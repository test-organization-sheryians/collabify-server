import type { PrismaClient, VaultFile } from "@prisma/client";

export async function softDeleteFile(
  fileId: string,
  db: PrismaClient
): Promise<VaultFile> {
  return db.vaultFile.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });
}
