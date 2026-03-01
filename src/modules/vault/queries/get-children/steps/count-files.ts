import type { PrismaClient } from "@prisma/client";

export async function countFiles(
  projectId: string,
  folderId: string | null | undefined,
  db: PrismaClient
): Promise<number> {
  return db.vaultFile.count({
    where: {
      projectId,
      folderId: folderId ?? null,
      status: "ACTIVE",
      deletedAt: null,
    },
  });
}
