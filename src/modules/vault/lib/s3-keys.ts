/**
 * Vault — S3 Key Builder & Presigned URL Utilities
 *
 * All S3 interactions for the Vault module go through this file.
 * Uses the shared infra S3 client (@/infra/aws/s3) — no separate client
 * instantiation so credentials and config are managed in one place.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { VAULT_S3 } from "./constants";

const BUCKET = env.S3_VAULT_BUCKET;

// ── Key Builder ────────────────────────────────────────────────────────────────

interface BuildS3KeyInput {
  workspaceId: string;
  projectId: string;
  source: string; // VaultFileSource value
  sourceId?: string | null;
  fileId: string;
  filename: string;
}

/**
 * Constructs a deterministic S3 key for a vault file.
 *
 * Pattern: vault/{workspaceId}/{projectId}/{source}/{sourceId|_}/{fileId}/{filename}
 *
 * The fileId segment guarantees uniqueness even for files with identical names.
 * The filename is preserved at the end for human-readable presigned URLs.
 */
export function buildS3Key(input: BuildS3KeyInput): string {
  const { workspaceId, projectId, source, sourceId, fileId, filename } = input;
  const context = sourceId ?? "_";
  // Sanitise filename: strip path traversal characters
  const safeName = filename.replace(/[/\\]/g, "_");
  return `vault/${workspaceId}/${projectId}/${source.toLowerCase()}/${context}/${fileId}/${safeName}`;
}

// ── Presigned PUT ──────────────────────────────────────────────────────────────

interface PresignedPutInput {
  s3Key: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Returns a presigned PUT URL the client can use to upload directly to S3.
 *
 * - ContentLength: enforced server-side — prevents size mismatch attacks.
 * - ContentType: passed as a condition for confirmUpload HeadObject verification.
 * - Tagging: upload-status=pending enables S3 lifecycle auto-expiry after 1 day
 *   if confirmUpload is never called.
 */
export async function generatePresignedPut(
  input: PresignedPutInput
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: input.s3Key,
    // NOTE: ContentType and ContentLength intentionally omitted.
    // Including them adds headers to X-Amz-SignedHeaders, which the browser must
    // replicate exactly in the CORS preflight — causing intermittent CORS failures.
    // MIME type is validated server-side in verifyS3Object via S3 HeadObject.
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: VAULT_S3.PRESIGNED_PUT_TTL_SECONDS,
  });
}

// ── Presigned GET ──────────────────────────────────────────────────────────────

/**
 * Returns a short-lived presigned GET URL for downloading/previewing a file.
 * TTL: 5 minutes — short enough to limit URL leakage window.
 */
export async function generatePresignedGet(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, {
    expiresIn: VAULT_S3.PRESIGNED_GET_TTL_SECONDS,
  });
}

// ── Head Object ────────────────────────────────────────────────────────────────

export interface S3ObjectMeta {
  contentLength: number;
  contentType: string;
}

/**
 * Fetches S3 object metadata without downloading the object body.
 * Used by confirmUpload to verify ContentLength and ContentType match
 * what the client declared at requestUpload time.
 */
export async function headS3Object(s3Key: string): Promise<S3ObjectMeta> {
  const command = new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  return {
    contentLength: response.ContentLength ?? 0,
    contentType: response.ContentType ?? "",
  };
}

// ── Delete Object ──────────────────────────────────────────────────────────────

/**
 * Permanently removes an object from the vault S3 bucket.
 * Used by hard-delete flows (e.g. file purge worker).
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
}
