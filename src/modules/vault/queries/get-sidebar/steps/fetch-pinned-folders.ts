import type { PrismaClient, VaultFolder } from "@prisma/client";

export async function fetchPinnedFolders(
  userId: string,
  projectId: string,
  db: PrismaClient
): Promise<VaultFolder[]> {
  const pins = await db.vaultPinnedFolder.findMany({
    where: { userId, projectId },
    include: { folder: true },
    orderBy: { pinnedAt: "asc" },
  });

  // Only return non-deleted folders
  return pins.map((p) => p.folder).filter((f) => f.deletedAt === null);
}
