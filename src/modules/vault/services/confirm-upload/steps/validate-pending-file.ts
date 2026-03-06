import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFile } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:confirm-upload:validate");

export async function validatePendingFile(
  fileId: string,
  userId: string,
  db: PrismaClient
): Promise<VaultFile> {
  logger.debug("validate-pending-file: looking up PENDING file", { fileId });

  const file = await db.vaultFile.findFirst({
    where: { id: fileId, status: "PENDING", deletedAt: null },
  });

  if (!file)
    throw AppError.notFound("Upload slot not found or already confirmed");

  if (file.uploaderUserId !== userId) {
    throw AppError.forbidden("You did not initiate this upload");
  }

  logger.debug("validate-pending-file: passed", {
    fileId,
    projectId: file.projectId,
    name: file.name,
  });

  return file;
}
