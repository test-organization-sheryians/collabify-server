import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

/**
 * Guard against circular moves: target must not be a descendant of the source folder.
 * Uses iterative BFS on ancestor chain of targetId.
 */
export async function validateMoveTarget(
  folderId: string,
  targetParentFolderId: string | null | undefined,
  db: PrismaClient
): Promise<void> {
  if (!targetParentFolderId) return; // moving to root is always safe

  if (targetParentFolderId === folderId) {
    throw AppError.badRequest("A folder cannot be moved into itself");
  }

  // Walk ancestor chain of target to check for folderId
  let currentId: string | null = targetParentFolderId;
  while (currentId) {
    if (currentId === folderId) {
      throw AppError.badRequest(
        "Cannot move a folder into one of its own descendants"
      );
    }
    const row: { parentFolderId: string | null } | null =
      await db.vaultFolder.findFirst({
        where: { id: currentId },
        select: { parentFolderId: true },
      });
    currentId = row?.parentFolderId ?? null;
  }

  // Verify target folder exists
  const target = await db.vaultFolder.findFirst({
    where: { id: targetParentFolderId, deletedAt: null },
  });
  if (!target) throw AppError.notFound("Target folder not found");
}
