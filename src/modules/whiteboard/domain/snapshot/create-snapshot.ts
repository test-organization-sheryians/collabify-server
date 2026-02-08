/**
 * S3 Snapshot Creator
 *
 * Creates and uploads Y.Doc snapshots to S3
 */

import { PrismaClient } from "@prisma/client";

export type CreateSnapshotResult = {
  s3Key: string;
  snapshotId: string;
  streamId: string;
  fileSizeBytes: bigint;
};

/**
 * Create S3 snapshot from current board state
 */
export const createS3Snapshot = async (
  db: PrismaClient,
  boardId: string,
  ydocBinary: Uint8Array,
  streamId: string
): Promise<CreateSnapshotResult> => {
  // TODO: V4 Architecture - Create S3 Snapshot
  // ============================================
  //
  // STEP 1: Generate S3 Key
  // ----------------------
  // - Pattern: whiteboard/{boardId}/snapshots/{timestamp}-{streamId}.bin
  // - Example: whiteboard/board_123/snapshots/1706789123456-0-1.bin
  // - Timestamp ensures uniqueness and chronological ordering
  //
  // STEP 2: Upload to S3
  // -------------------
  // - Use S3 client (from infra/s3-client.ts)
  // - await s3Client.uploadSnapshot(s3Key, ydocBinary)
  // - Set metadata: { boardId, streamId, timestamp }
  // - Set storage class: STANDARD (for recent snapshots)
  //
  // STEP 3: Update Prisma (Atomic Transaction)
  // ------------------------------------------
  // await db.whiteboard.update({
  //   where: { id: boardId },
  //   data: {
  //     s3Key: s3Key,
  //     lastSnapshotStreamId: streamId,
  //     lastSnapshotAt: new Date(),
  //     fileSizeBytes: BigInt(ydocBinary.byteLength),
  //     updatedAt: new Date(),
  //   }
  // });
  //
  // STEP 4: Create Snapshot Record (Optional - for history)
  // -------------------------------------------------------
  // - If we want to keep snapshot history:
  // await db.whiteboardSnapshot.create({
  //   data: {
  //     whiteboardId: boardId,
  //     s3Key,
  //     streamId,
  //     fileSizeBytes: BigInt(ydocBinary.byteLength),
  //   }
  // });
  //
  // STEP 5: Return Result
  // --------------------
  // return {
  //   s3Key,
  //   snapshotId: generatedId,
  //   streamId,
  //   fileSizeBytes: BigInt(ydocBinary.byteLength)
  // };
  //
  // ERROR HANDLING:
  // - S3 upload failure → retry 3x with exponential backoff
  // - Prisma update failure → rollback (delete S3 snapshot)
  // - Disk full / quota exceeded → return error "STORAGE_LIMIT_EXCEEDED"
  //
  // PERFORMANCE NOTES:
  // - This is async and should not block WebSocket handlers
  // - Called by background job (snapshot-worker)
  // - Consider compression before upload (gzip)
  //
  // ============================================

  throw new Error("TODO: Implement createS3Snapshot");
};
