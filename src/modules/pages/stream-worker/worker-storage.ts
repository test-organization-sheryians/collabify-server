/**
 * Stream Worker — S3 upload operations.
 *
 * Different from graphql/page-storage.ts:
 * The worker writes BOTH a historical snapshot (before overwriting) AND the latest snapshot.
 * This preserves disaster recovery history.
 *
 * UPLOAD ORDER (critical):
 * 1. Upload historical FIRST (e.g., pages/{pageId}/snapshots/{ts}.yjs)
 * 2. THEN overwrite latest (pages/{pageId}/latest.yjs)
 * If the process crashes between 1 and 2: historical exists, latest is from previous snapshot.
 * Future recovery can detect the mismatch and rebuild.
 */

import { s3Client } from "@/infra/aws/s3";
import { PageS3Keys } from "../infra/page-keys";

/**
 * Write snapshot to S3 in the correct order:
 *   1. Historical (new archive entry)
 *   2. Latest (overwrite of canonical key)
 *
 * @param pageId  - Page identifier
 * @param state   - Y.encodeStateAsUpdate() output
 *
 * TODO: Implement
 *   const timestamp = Date.now()
 *   const historicalKey = PageS3Keys.HistoricalSnapshot(pageId, timestamp)
 *   const latestKey = PageS3Keys.LatestSnapshot(pageId)
 *   await s3Client.putObject({ Key: historicalKey, Body: state, ContentType: 'application/octet-stream' })
 *   await s3Client.putObject({ Key: latestKey, Body: state, ContentType: 'application/octet-stream' })
 *   return { historicalKey, latestKey, timestamp }
 */
export async function saveSnapshotToS3(
  pageId: string,
  state: Buffer
): Promise<{ historicalKey: string; latestKey: string; timestamp: number }> {
  // TODO: see JSDoc above
  throw new Error("saveSnapshotToS3: not implemented");
}
