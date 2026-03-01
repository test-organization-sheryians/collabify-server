import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function createFolderRecord(
  projectId: string,
  name: string,
  parentFolderId: string | null | undefined,
  db: PrismaClient
): Promise<VaultFolder> {
  return db.vaultFolder.create({
    data: { projectId, name, parentFolderId: parentFolderId ?? null },
  });
}
