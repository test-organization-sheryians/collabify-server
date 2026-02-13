/**
 * S3 Client for Whiteboard Snapshots
 *
 * Wrapper around AWS S3 SDK for snapshot operations
 */

import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
import { WhiteboardKeys } from "./whiteboard-keys";

export type S3SnapshotMetadata = {
  boardId: string;
  streamId: string;
  timestamp: number;
  elementCount: number;
};

/**
 * Generate S3 key for board snapshot
 *
 * @deprecated Use WhiteboardKeys.S3SnapshotTimestamped() directly
 */
export const generateSnapshotKey = (
  boardId: string,
  timestamp: number
): string => {
  return WhiteboardKeys.S3SnapshotTimestamped(boardId, timestamp);
};

/**
 * Upload snapshot to S3
 */
export const uploadSnapshot = async (
  boardId: string,
  binary: Uint8Array,
  metadata: S3SnapshotMetadata
): Promise<string> => {
  const s3Key = generateSnapshotKey(boardId, metadata.timestamp);

  try {
    const command = new PutObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: s3Key,
      Body: binary,
      ContentType: "application/octet-stream",
      Metadata: {
        boardId: metadata.boardId,
        streamId: metadata.streamId,
        timestamp: metadata.timestamp.toString(),
        elementCount: metadata.elementCount.toString(),
      },
      StorageClass: "STANDARD",
    });

    await s3Client.send(command);

    logger.info({
      msg: "Snapshot uploaded to S3",
      boardId,
      s3Key,
      sizeBytes: binary.byteLength,
    });

    return s3Key;
  } catch (error) {
    logger.error({
      err: error,
      msg: "Failed to upload snapshot to S3",
      boardId,
      s3Key,
    });
    throw error;
  }
};

/**
 * Download snapshot from S3
 */
export const downloadSnapshot = async (s3Key: string): Promise<Uint8Array> => {
  try {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new GetObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: s3Key,
    });

    logger.info({ s3Key }, "Downloading snapshot from S3");

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("S3 response body is empty");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - AWS SDK stream types are complex
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const binary = Buffer.concat(chunks);

    logger.info(
      { s3Key, sizeBytes: binary.byteLength },
      "Snapshot downloaded successfully from S3"
    );

    return new Uint8Array(binary);
  } catch (error) {
    logger.error(
      {
        error,
        s3Key,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "Failed to download snapshot from S3"
    );
    throw error;
  }
};

/**
 * List snapshots for a board
 */
export const listSnapshots = async (
  boardId: string
): Promise<Array<{ s3Key: string; timestamp: Date; size: number }>> => {
  // TODO: V4 Architecture - List Snapshots
  // ============================================
  //
  // STEP 1: List Objects by Prefix
  // ------------------------------
  // import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
  // const prefix = `whiteboard/${boardId}/snapshots/`;
  // const command = new ListObjectsV2Command({
  //   Bucket: env.S3_WHITEBOARD_BUCKET,
  //   Prefix: prefix,
  // });
  // const response = await s3.send(command);
  //
  // STEP 2: Parse and Sort
  // ----------------------
  // - Extract: Key, LastModified, Size
  // - Sort by LastModified DESC (most recent first)
  //
  // STEP 3: Return Metadata
  // ----------------------
  // return response.Contents.map(obj => ({
  //   s3Key: obj.Key,
  //   timestamp: obj.LastModified,
  //   size: obj.Size
  // }));
  //
  // ============================================

  throw new Error("TODO: Implement listSnapshots");
};

/**
 * Delete snapshot from S3
 */
export const deleteSnapshot = async (s3Key: string): Promise<void> => {
  // TODO: V4 Architecture - Delete Snapshot
  // ============================================
  //
  // STEP 1: Delete Object
  // --------------------
  // import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
  // const command = new DeleteObjectCommand({
  //   Bucket: env.S3_WHITEBOARD_BUCKET,
  //   Key: s3Key,
  // });
  // await s3.send(command);
  //
  // STEP 2: Clear Cache
  // ------------------
  // - DEL snapshot:${s3Key}
  //
  // WARNING:
  // - Only delete old snapshots when new one is confirmed safe
  // - Never delete the most recent snapshot
  //
  // ============================================

  throw new Error("TODO: Implement deleteSnapshot");
};
