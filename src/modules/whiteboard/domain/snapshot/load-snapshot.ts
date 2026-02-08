/**
 * S3 Snapshot Loader
 *
 * Downloads and decodes Y.Doc snapshots from S3
 */

export type SnapshotData = {
  binary: Uint8Array;
  streamId: string;
  timestamp: Date;
};

/**
 * Load snapshot from S3
 */
export const loadS3Snapshot = async (s3Key: string): Promise<SnapshotData> => {
  // TODO: V4 Architecture - Load S3 Snapshot
  // ============================================
  //
  // STEP 1: Download from S3
  // ------------------------
  // - Use S3 client (from infra/s3-client.ts)
  // - const binary = await s3Client.downloadSnapshot(s3Key);
  // - Get object metadata (streamId, timestamp)
  //
  // STEP 2: Validate Binary
  // -----------------------
  // - Check it's a valid Uint8Array
  // - Use domain/board-state/encode-decode.ts::validateYDocUpdate()
  // - If invalid → throw Error("Corrupted snapshot")
  //
  // STEP 3: Return Snapshot Data
  // ----------------------------
  // return {
  //   binary,
  //   streamId: metadata.streamId,
  //   timestamp: new Date(metadata.timestamp)
  // };
  //
  // ERROR HANDLING:
  // - S3 key not found → "SNAPSHOT_NOT_FOUND"
  // - Download failure → retry 3x
  // - Corrupted data → "SNAPSHOT_CORRUPTED"
  //
  // CACHING:
  // - Consider caching in Redis for 5 minutes
  // - Key: snapshot:{s3Key}
  // - Reduces S3 costs for frequently accessed boards
  //
  // ============================================

  throw new Error("TODO: Implement loadS3Snapshot");
};
