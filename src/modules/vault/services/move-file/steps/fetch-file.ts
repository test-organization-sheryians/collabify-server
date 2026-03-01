import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFile } from "@prisma/client";

export async function fetchActiveFileForEdit(
  fileId: string,
  userId: string,
  db: PrismaClient
): Promise<VaultFile> {
  const file = await db.vaultFile.findFirst({
    where: { id: fileId, status: "ACTIVE", deletedAt: null },
  });

  if (!file) throw AppError.notFound("File not found");

  // Only the uploader can edit their own file (TODO: extend to project admins)
  if (file.uploaderUserId !== userId) {
    throw AppError.forbidden("You do not have permission to modify this file");
  }

  return file;
}
