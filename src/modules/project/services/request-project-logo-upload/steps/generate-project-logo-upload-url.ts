/**
 * Generates a presigned PUT URL for project logo upload.
 *
 * Pattern identical to workspace logo upload — reuses Vault S3 helpers.
 * No VaultFile is created; no quota is tracked.
 *
 * S3 Key pattern: project-assets/{projectId}/logo
 * Fixed key (no fileId) — each upload overwrites the previous logo.
 * No orphan cleanup needed because the key is stable per project.
 *
 * WHY presigned GET for logoUrl:
 *   The vault S3 bucket is private. Returning a bare S3 URL causes a 403
 *   in the browser. We generate a long-lived presigned GET (7 days)
 *   so the browser can render the image.
 */
import { generatePresignedPut, generatePresignedGet } from "@/modules/vault/lib/s3-keys";
import { VAULT_S3 } from "@/modules/vault/lib/constants";

/** 7 days — long enough to survive session gaps, short enough to limit URL leakage. */
const LOGO_PRESIGNED_GET_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function generateProjectLogoUploadUrl(
  projectId: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ presignedUrl: string; logoUrl: string; expiresAt: string }> {
  const s3Key = `project-assets/${projectId}/logo`;

  const [presignedUrl, logoUrl] = await Promise.all([
    generatePresignedPut({ s3Key, sizeBytes, mimeType }),
    generatePresignedGet(s3Key, LOGO_PRESIGNED_GET_TTL_SECONDS),
  ]);

  const expiresAt = new Date(
    Date.now() + VAULT_S3.PRESIGNED_PUT_TTL_SECONDS * 1000
  ).toISOString();

  return { presignedUrl, logoUrl, expiresAt };
}
