/**
 * Page Storage — S3 read/write operations for GraphQL handlers.
 *
 * SCOPE: Used by GraphQL handlers only (createPage, getPageSnapshot).
 * The stream worker has its own worker-storage.ts with different upload semantics.
 *
 * Do NOT import this from the stream worker.
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { s3Client } from "@/infra/aws/s3";
import { PageS3Keys } from "./page-keys";
import { env } from "@/shared/config/env";

const BUCKET = env.S3_WHITEBOARD_BUCKET;

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a page snapshot to S3.
 * Used by createPage (initial empty Y.Doc state).
 *
 * IMPORTANT: If this fails, the caller must clean up the DB row to avoid
 * orphaned pages with no S3 snapshot.
 *
 * @param pageId - The page cuid (key derived internally)
 * @param data   - Y.encodeStateAsUpdate() output
 */
export async function uploadPageSnapshot(
  pageId: string,
  data: Buffer
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: PageS3Keys.LatestSnapshot(pageId),
      Body: data,
      ContentType: "application/octet-stream",
    })
  );
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Download a page snapshot from S3.
 * Returns null if the object does not exist (NoSuchKey).
 * Throws for all other S3 errors.
 *
 * @param s3Key - From DB page.s3Key — stable reference to this page's snapshot
 */
export async function downloadPageSnapshot(
  s3Key: string
): Promise<Buffer | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: s3Key })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return Buffer.from(bytes);
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

// ─── List (admin/recovery) ───────────────────────────────────────────────────

/**
 * List all historical snapshots for a page, sorted by key (= by timestamp).
 * Used by admin recovery tools — NOT in the hot path.
 */
export async function listPageSnapshots(pageId: string): Promise<string[]> {
  const result = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `pages/${pageId}/snapshots/`,
    })
  );
  return (result.Contents ?? [])
    .map((obj: { Key?: string }) => obj.Key!)
    .filter(Boolean)
    .sort();
}
