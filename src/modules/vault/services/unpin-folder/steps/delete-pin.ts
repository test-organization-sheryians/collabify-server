import type { PrismaClient } from "@prisma/client";

export async function deletePin(
  userId: string,
  folderId: string,
  db: PrismaClient
): Promise<void> {
  await db.vaultPinnedFolder.deleteMany({
    where: { userId, folderId },
  });
}
