import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function fetchSystemFolders(
  projectId: string,
  db: PrismaClient
): Promise<VaultFolder[]> {
  return db.vaultFolder.findMany({
    where: { projectId, isSystem: true, deletedAt: null },
    orderBy: { name: "asc" },
  });
}
