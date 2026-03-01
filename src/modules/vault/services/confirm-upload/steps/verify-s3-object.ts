import { AppError } from "@/shared/errors";
import { headS3Object } from "../../../lib/s3-keys";
import type { VaultFile } from "@prisma/client";

/**
 * Verifies the uploaded S3 object matches what the client declared.
 * Prevents size mismatch attacks and MIME type bypass.
 */
export async function verifyS3Object(file: VaultFile): Promise<void> {
  const meta = await headS3Object(file.s3Key).catch(() => {
    throw AppError.badRequest("File not found in S3 — upload may have failed");
  });

  const declaredSize = Number(file.sizeBytes);
  if (meta.contentLength !== declaredSize) {
    throw AppError.badRequest(
      `File size mismatch: expected ${declaredSize}, got ${meta.contentLength}`
    );
  }

  if (meta.contentType !== file.mimeType) {
    throw AppError.badRequest(
      `MIME type mismatch: expected ${file.mimeType}, got ${meta.contentType}`
    );
  }
}
