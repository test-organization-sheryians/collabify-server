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
 * Returns S3 key instead of presigned URL - the client will use this
 * S3 key when calling updateProject, and we'll generate presigned
 * GET URLs on-demand when serving to clients.
 */
import { generatePresignedPut } from "@/modules/vault/lib/s3-keys";
import { VAULT_S3 } from "@/modules/vault/lib/constants";

export async function generateProjectLogoUploadUrl(
  projectId: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ presignedUrl: string; logoS3Key: string; expiresAt: string }> {
  const s3Key = `project-assets/${projectId}/logo`;

  const presignedUrl = await generatePresignedPut({ s3Key, sizeBytes, mimeType });

  const expiresAt = new Date(
    Date.now() + VAULT_S3.PRESIGNED_PUT_TTL_SECONDS * 1000
  ).toISOString();

  return { presignedUrl, logoS3Key: s3Key, expiresAt };
}
