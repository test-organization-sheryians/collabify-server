/**
 * Issues — S3 Key Builder & Presigned URL Utilities
 *
 * All S3 interactions for the Issues module go through this file.
 * Uses the shared infra S3 client (@/infra/aws/s3).
 *
 * Key pattern: issues/{workspaceId}/{projectId}/{issueId}/description/{fileId}.json
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { ISSUE_S3 } from "./constants";

const BUCKET = env.S3_VAULT_BUCKET;

// ── Key Builder ───────────────────────────────────────────────────────────────

/**
 * Builds the S3 key for a BlockNote description file.
 * Each save creates a new file at a unique key (immutable objects).
 */
export function buildIssueDescriptionKey(
  workspaceId: string,
  projectId: string,
  issueId: string,
  descriptionFileId: string
): string {
  return `issues/${workspaceId}/${projectId}/${issueId}/description/${descriptionFileId}.json`;
}

// ── Presigned PUT ─────────────────────────────────────────────────────────────

/**
 * Returns a presigned PUT URL for uploading a BlockNote description JSON.
 * TTL: 15 minutes. ContentType/ContentLength intentionally omitted to
 * avoid CORS header matching issues (same pattern as Vault).
 */
export async function generateDescriptionPresignedPut(
  s3Key: string
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, {
    expiresIn: ISSUE_S3.PRESIGNED_PUT_TTL_SECONDS,
  });
}

// ── Presigned GET ─────────────────────────────────────────────────────────────

/**
 * Returns a short-lived presigned GET URL for reading a description from S3.
 * TTL: 5 minutes. Always request fresh — never cache.
 */
export async function generateDescriptionPresignedGet(
  s3Key: string
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, {
    expiresIn: ISSUE_S3.PRESIGNED_GET_TTL_SECONDS,
  });
}

// ── Head Object ───────────────────────────────────────────────────────────────

export interface S3ObjectMeta {
  contentLength: number;
}

/**
 * Fetches S3 object metadata without downloading the body.
 * Used by confirmDescriptionUpload to verify the object exists and record size.
 */
export async function headS3DescriptionObject(
  s3Key: string
): Promise<S3ObjectMeta> {
  const command = new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  return { contentLength: response.ContentLength ?? 0 };
}
