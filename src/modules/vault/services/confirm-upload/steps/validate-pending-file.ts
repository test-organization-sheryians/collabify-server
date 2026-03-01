import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFile } from "@prisma/client";

export async function validatePendingFile(
  fileId: string,
  userId: string,
  db: PrismaClient
): Promise<VaultFile> {
  const file = await db.vaultFile.findFirst({
    where: { id: fileId, status: "PENDING", deletedAt: null },
  });

  if (!file)
    throw AppError.notFound("Upload slot not found or already confirmed");

  if (file.uploaderUserId !== userId) {
    throw AppError.forbidden("You did not initiate this upload");
  }

  return file;
}
