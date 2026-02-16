/**
 * S3 Client for Whiteboard Snapshots (V4 - Merged)
 *
 * Unified S3 operations for both query handlers and stream worker
 */

import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client as awsS3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";
import { WhiteboardKeys } from "./whiteboard-keys";

const logger = createLogger("whiteboard:infra:s3");

export type S3SnapshotMetadata = {
  boardId: string;
  streamId: string;
  timestamp: number;
  elementCount: number;
};

/**
 * Get latest board snapshot from S3
 * Used by stream worker for cold start
 */
export async function getLatestSnapshot(
  boardId: string
): Promise<{ data: Uint8Array; streamId: string } | null> {
  try {
    const key = WhiteboardKeys.S3SnapshotLatest(boardId);

    const command = new GetObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: key,
    });

    const response = await awsS3Client.send(command);

    if (!response.Body) {
      return null;
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    // ✅ FIX: Use lowercase (AWS S3 normalizes metadata keys to lowercase)
    const streamId = response.Metadata?.streamid || "0-0";

    logger.debug("Loaded S3 snapshot", {
      boardId,
      streamId,
      size: data.length,
    });

    return {
      data: new Uint8Array(data),
      streamId,
    };
  } catch (error: any) {
    if (error.name === "NoSuchKey") {
      logger.debug("No S3 snapshot found (new board)", { boardId });
      return null;
    }

    logger.error("S3 getLatestSnapshot failed", { error, boardId });
    throw error;
  }
}

/**
 * Put snapshot to S3 with metadata
 * Used by stream worker for snapshot creation
 */
export async function putSnapshot(
  boardId: string,
  data: Uint8Array,
  metadata: {
    streamId: string;
    timestamp: string;
    size?: string;
    reason?: string;
  },
  isLatest: boolean = false
): Promise<string> {
  const key = isLatest
    ? WhiteboardKeys.S3SnapshotLatest(boardId)
    : WhiteboardKeys.S3SnapshotTimestamped(boardId, Date.now());

  try {
    const command = new PutObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: key,
      Body: Buffer.from(data),
      ContentType: "application/octet-stream",
      // ✅ FIX: Use lowercase keys (AWS normalizes to lowercase)
      Metadata: {
        boardid: boardId,
        streamid: metadata.streamId,
        timestamp: metadata.timestamp,
        size: metadata.size || String(data.length),
        reason: metadata.reason || "manual",
      },
      StorageClass: "STANDARD",
    });

    await awsS3Client.send(command);

    logger.info("S3 snapshot written", {
      boardId,
      key,
      size: data.length,
      streamId: metadata.streamId,
      isLatest,
    });

    return key;
  } catch (error) {
    logger.error("S3 putSnapshot failed", { error, boardId, key });
    throw error;
  }
}

/**
 * Upload snapshot to S3 (used by create-board service)
 * Legacy wrapper for backward compatibility
 */
export async function uploadSnapshot(
  boardId: string,
  binary: Uint8Array,
  metadata: S3SnapshotMetadata
): Promise<string> {
  const key = WhiteboardKeys.S3SnapshotTimestamped(boardId, metadata.timestamp);

  try {
    const command = new PutObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: key,
      Body: binary,
      ContentType: "application/octet-stream",
      Metadata: {
        boardid: metadata.boardId,
        streamid: metadata.streamId,
        timestamp: metadata.timestamp.toString(),
        elementcount: metadata.elementCount.toString(),
      },
      StorageClass: "STANDARD",
    });

    await awsS3Client.send(command);

    logger.info("Snapshot uploaded to S3", {
      boardId,
      key,
      sizeBytes: binary.byteLength,
    });

    return key;
  } catch (error) {
    logger.error("Failed to upload snapshot to S3", {
      err: error,
      boardId,
      key,
    });
    throw error;
  }
}

/**
 * Download snapshot from S3 (used by query handler)
 */
export async function downloadSnapshot(s3Key: string): Promise<Uint8Array> {
  try {
    const command = new GetObjectCommand({
      Bucket: env.S3_WHITEBOARD_BUCKET,
      Key: s3Key,
    });

    logger.info("Downloading snapshot from S3", { s3Key });

    const response = await awsS3Client.send(command);

    if (!response.Body) {
      throw new Error("S3 response body is empty");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const binary = Buffer.concat(chunks);

    logger.info("Snapshot downloaded successfully from S3", {
      s3Key,
      sizeBytes: binary.byteLength,
    });

    return new Uint8Array(binary);
  } catch (error) {
    logger.error("Failed to download snapshot from S3", {
      error,
      s3Key,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Export consolidated s3Client object for worker compatibility
export const s3Client = {
  getLatestSnapshot,
  putSnapshot,
};
