import { generatePresignedGet } from "../../../lib/s3-keys";
import { VAULT_S3 } from "../../../lib/constants";

export async function generateDownloadUrl(
  s3Key: string
): Promise<{ url: string; expiresAt: Date }> {
  const url = await generatePresignedGet(s3Key);
  const expiresAt = new Date(
    Date.now() + VAULT_S3.PRESIGNED_GET_TTL_SECONDS * 1000
  );
  return { url, expiresAt };
}
