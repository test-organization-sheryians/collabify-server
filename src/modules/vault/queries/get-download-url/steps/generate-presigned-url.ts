import { generatePresignedGet } from "@/modules/vault/lib/s3-keys";

/**
 * Generates a short-lived presigned S3 GET URL for a vault file.
 *
 * Uses the file's s3Key to call AWS directly — the returned URL is
 * publicly usable (no auth headers needed) for its TTL, making it
 * safe to use as an <img> src cross-origin.
 *
 * Default TTL: 5 minutes (VAULT_S3.PRESIGNED_GET_TTL_SECONDS in lib/constants).
 */
export async function generateDownloadUrl(
  s3Key: string
): Promise<{ url: string }> {
  const url = await generatePresignedGet(s3Key);
  return { url };
}
