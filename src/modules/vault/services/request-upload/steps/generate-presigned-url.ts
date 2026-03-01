import { generatePresignedPut } from "../../../lib/s3-keys";
import { VAULT_S3 } from "../../../lib/constants";

export async function generatePutUrl(
  s3Key: string,
  sizeBytes: number,
  mimeType: string
): Promise<{ url: string; expiresAt: Date }> {
  const url = await generatePresignedPut({ s3Key, sizeBytes, mimeType });
  const expiresAt = new Date(
    Date.now() + VAULT_S3.PRESIGNED_PUT_TTL_SECONDS * 1000
  );
  return { url, expiresAt };
}
