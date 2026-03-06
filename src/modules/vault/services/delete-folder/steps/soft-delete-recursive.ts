import type { PrismaClient } from "@prisma/client";

/**
 * Recursively soft-deletes a folder and all its descendants.
 *
 * Strategy: collect all descendant folder IDs via iterative BFS (safe for shallow trees),
 * then batch-delete folders and files in two Prisma calls.
 *
 * For very deep nesting, consider a PostgreSQL WITH RECURSIVE CTE instead.
 */
export async function softDeleteRecursive(
  rootFolderId: string,
  db: PrismaClient
): Promise<void> {
  const now = new Date();

  // BFS to collect all descendant folder IDs
  const folderIds: string[] = [rootFolderId];
  const queue: string[] = [rootFolderId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await db.vaultFolder.findMany({
      where: { parentFolderId: parentId, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) {
      folderIds.push(child.id);
      queue.push(child.id);
    }
  }

  // Batch soft-delete all collected folders and their files
  await Promise.all([
    db.vaultFolder.updateMany({
      where: { id: { in: folderIds } },
      data: { deletedAt: now },
    }),
    db.vaultFile.updateMany({
      where: { folderId: { in: folderIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);
}
