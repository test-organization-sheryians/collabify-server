import { AppError } from "@/shared/errors";
import { headS3Object } from "../../../lib/s3-keys";
import type { VaultFile } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:confirm-upload:verify-s3");

/**
 * Verifies the uploaded S3 object matches what the client declared.
 * Only checks ContentLength — MIME type is validated at validateUploadInput.
 * (ContentType is intentionally not enforced in the presigned PUT to avoid CORS issues.)
 */
export async function verifyS3Object(file: VaultFile): Promise<void> {
  logger.debug("verify-s3-object: HeadObject", {
    s3Key: file.s3Key,
    expectedSize: Number(file.sizeBytes),
  });

  const meta = await headS3Object(file.s3Key).catch(() => {
    throw AppError.badRequest("File not found in S3 — upload may have failed");
  });

  const declaredSize = Number(file.sizeBytes);
  if (meta.contentLength !== declaredSize) {
    throw AppError.badRequest(
      `File size mismatch: expected ${declaredSize}, got ${meta.contentLength}`
    );
  }

  logger.debug("verify-s3-object: passed", {
    contentLength: meta.contentLength,
  });
}
