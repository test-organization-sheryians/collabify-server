import { generatePresignedPut } from "../../../lib/s3-keys";
import { VAULT_S3 } from "../../../lib/constants";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:request-upload:presign");

export async function generatePutUrl(
  s3Key: string,
  sizeBytes: number,
  mimeType: string
): Promise<{ url: string; expiresAt: Date }> {
  logger.info("generate-presigned-url: generating PUT URL", {
    s3Key,
    sizeBytes,
    mimeType,
    ttlSeconds: VAULT_S3.PRESIGNED_PUT_TTL_SECONDS,
  });

  const url = await generatePresignedPut({ s3Key, sizeBytes, mimeType });
  const expiresAt = new Date(
    Date.now() + VAULT_S3.PRESIGNED_PUT_TTL_SECONDS * 1000
  );

  logger.info("generate-presigned-url: done", { expiresAt });
  return { url, expiresAt };
}
