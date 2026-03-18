import type { PrismaClient } from "@prisma/client";

export async function upsertPin(
  userId: string,
  projectId: string,
  folderId: string,
  db: PrismaClient
): Promise<void> {
  await db.vaultPinnedFolder.upsert({
    where: { userId_folderId: { userId, folderId } },
    update: { pinnedAt: new Date() },
    create: { userId, projectId, folderId },
  });
}
