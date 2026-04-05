/**
 * Generates a presigned PUT URL for workspace logo upload.
 *
 * Reuses `generatePresignedPut` and `generatePresignedGet` from the Vault
 * infrastructure layer (vault/lib/s3-keys.ts). This is the ONLY vault
 * component being reused. No VaultFile DB row is created. No quota is tracked.
 * This is intentional — workspace logos are workspace-scoped assets, not
 * project vault files.
 *
 * S3 Key pattern: workspace-assets/{workspaceId}/logo
 * Fixed key (no fileId) — each upload overwrites the previous logo.
 * No orphan cleanup needed because the key is stable per workspace.
 *
 * WHY presigned GET for logoUrl:
 *   The vault S3 bucket is private (no public ACL). Returning a bare
 *   `https://bucket.s3.amazonaws.com/key` URL causes a 403 in the browser
 *   which base-ui Avatar treats as an image load error, silently falling back
 *   to the avatar initials. We generate a long-lived presigned GET (7 days)
 *   so the browser can load the image. Active sessions will get a fresh URL
 *   on the next useMyWorkspaces refetch (staleTime: 5m) well before the 7-day
 *   window closes.
 */
import { generatePresignedPut, generatePresignedGet } from "@/modules/vault/lib/s3-keys";
import { VAULT_S3 } from "@/modules/vault/lib/constants";

/** 7 days — long enough to survive session gaps, short enough to limit URL leakage. */
const LOGO_PRESIGNED_GET_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function generateLogoUploadUrl(
  workspaceId: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ presignedUrl: string; logoUrl: string; expiresAt: string }> {
  const s3Key = `workspace-assets/${workspaceId}/logo`;

  // Issue both URLs in parallel — PUT for the client to upload, GET to persist as logoUrl
  const [presignedUrl, logoUrl] = await Promise.all([
    generatePresignedPut({ s3Key, sizeBytes, mimeType }),
    generatePresignedGet(s3Key, LOGO_PRESIGNED_GET_TTL_SECONDS),
  ]);

  // expiresAt reflects the PUT window (client must complete upload before this)
  const expiresAt = new Date(Date.now() + VAULT_S3.PRESIGNED_PUT_TTL_SECONDS * 1000).toISOString();

  return { presignedUrl, logoUrl, expiresAt };
}
