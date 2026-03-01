/**
 * confirmVaultUpload — Service Handler
 *
 * Step 2 of 2-step upload flow.
 * Verifies the S3 object then activates the file.
 *
 * Steps:
 *   1. validatePendingFile — fetch PENDING file, check ownership
 *   2. verifyS3Object      — S3 HeadObject: size + MIME match
 *   3. activateFile        — set ACTIVE, update UsageRecord
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ConfirmVaultUploadInput } from "./schema";
import { validatePendingFile } from "./steps/validate-pending-file";
import { verifyS3Object } from "./steps/verify-s3-object";
import { activateFile } from "./steps/activate-file";

const logger = createLogger("vault:services:confirm-upload");

export const confirmVaultUploadHandler = async (
  input: ConfirmVaultUploadInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  logger.debug("confirmVaultUpload started", { userId, fileId: input.fileId });

  const file = await validatePendingFile(input.fileId, userId, ctx.db);
  await verifyS3Object(file);
  const activeFile = await activateFile(file, ctx.db);

  logger.info("Upload confirmed", { fileId: file.id, userId });
  logger.debug("confirmVaultUpload done", {
    fileId: activeFile.id,
    status: activeFile.status,
    sizeBytes: activeFile.sizeBytes.toString(),
  });

  return { file: activeFile };
};
