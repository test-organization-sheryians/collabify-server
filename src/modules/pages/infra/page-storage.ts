/**
 * Page Storage — S3 read/write operations for GraphQL handlers.
 *
 * SCOPE: Used by GraphQL handlers only (createPage, getPageSnapshot).
 * The stream worker has its own worker-storage.ts with different upload semantics
 * (it writes both latest + historical snapshots together).
 *
 * Do NOT import this from the stream worker.
 */

import { s3Client } from "@/infra/aws/s3";
import { PageS3Keys } from "./page-keys";

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a page snapshot to S3 (used by createPage on initial page creation).
 *
 * IMPORTANT: If this fails, the caller (createPage handler) must clean up the
 * DB row to avoid orphaned pages with no S3 snapshot.
 *
 * @param s3Key - From PageS3Keys.LatestSnapshot(pageId)
 * @param data  - Yjs encodeStateAsUpdate() output
 *
 * TODO: Implement
 * await s3Client.putObject({
 *   Key: s3Key,
 *   Body: data,
 *   ContentType: 'application/octet-stream',
 * })
 */
export async function uploadPageSnapshot(
  s3Key: string,
  data: Buffer
): Promise<void> {
  // TODO: await s3Client.putObject({ Key: s3Key, Body: data, ContentType: 'application/octet-stream' })
  throw new Error("uploadPageSnapshot: not implemented");
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Download a page snapshot from S3.
 *
 * Returns null if the object does not exist (NoSuchKey).
 * Throws for all other S3 errors (permission denied, network, etc.).
 *
 * @param s3Key - From DB page.s3Key — the stable reference to this page's snapshot
 *
 * TODO: Implement
 * try {
 *   const result = await s3Client.getObject({ Key: s3Key })
 *   return Buffer.from(await result.Body.transformToByteArray())
 * } catch (err) {
 *   if (err.name === 'NoSuchKey') return null
 *   throw err
 * }
 */
export async function downloadPageSnapshot(
  s3Key: string
): Promise<Buffer | null> {
  // TODO: see JSDoc above
  throw new Error("downloadPageSnapshot: not implemented");
}

// ─── List (admin/recovery) ───────────────────────────────────────────────────

/**
 * List all historical snapshots for a page (sorted by key = sorted by timestamp).
 * Used by admin recovery tools — NOT in the hot path.
 *
 * @param pageId - The page whose history to list
 *
 * TODO: Implement
 * const result = await s3Client.listObjectsV2({
 *   Prefix: `pages/${pageId}/snapshots/`
 * })
 * return (result.Contents ?? []).map(obj => obj.Key!).sort()
 */
export async function listPageSnapshots(pageId: string): Promise<string[]> {
  // TODO: see JSDoc above
  throw new Error("listPageSnapshots: not implemented");
}
