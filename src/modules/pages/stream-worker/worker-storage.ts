/**
 * Stream Worker — S3 upload operations.
 *
 * UPLOAD ORDER (critical — do NOT swap):
 * 1. Upload historical FIRST  (pages/{pageId}/snapshots/{ts}.yjs)
 * 2. THEN overwrite latest    (pages/{pageId}/latest.yjs)
 *
 * If the process crashes between 1 and 2: historical exists, latest is from
 * the previous snapshot. Recovery can detect the mismatch and rebuild.
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/infra/aws/s3";
import { PageS3Keys } from "../infra/page-keys";
import { env } from "@/shared/config/env";

const BUCKET = env.S3_WHITEBOARD_BUCKET;

/**
 * Write snapshot to S3 in the correct order: historical then latest.
 *
 * @param pageId - Page identifier
 * @param state  - Y.encodeStateAsUpdate() output (full state, not a delta)
 */
export async function saveSnapshotToS3(
  pageId: string,
  state: Buffer
): Promise<{ historicalKey: string; latestKey: string; timestamp: number }> {
  const timestamp = Date.now();
  const historicalKey = PageS3Keys.HistoricalSnapshot(pageId, timestamp);
  const latestKey = PageS3Keys.LatestSnapshot(pageId);

  // Step 1: historical first (crash-safe)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: historicalKey,
      Body: state,
      ContentType: "application/octet-stream",
    })
  );

  // Step 2: overwrite latest
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: latestKey,
      Body: state,
      ContentType: "application/octet-stream",
    })
  );

  return { historicalKey, latestKey, timestamp };
}
