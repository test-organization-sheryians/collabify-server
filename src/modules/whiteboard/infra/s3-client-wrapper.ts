import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { s3Client as awsS3Client } from "@/infra/aws/s3";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
import { WhiteboardKeys } from "./whiteboard-keys";

/**
 * Whiteboard S3 Client Wrapper (V4 Architecture)
 *
 * **Purpose:** Minimal wrapper for worker snapshot operations
 * **Exports:** s3Client object for whiteboard-stream-worker.ts
 */

export const s3Client = {
  /**
   * Get latest board snapshot from S3
   *
   * **Returns:** Snapshot data + metadata (streamId tracking)
   */
  async getLatestSnapshot(
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

      const streamId = response.Metadata?.streamid || "0-0";

      logger.debug(
        { boardId, streamId, size: data.length },
        "Loaded S3 snapshot"
      );

      return {
        data: new Uint8Array(data),
        streamId,
      };
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        logger.debug({ boardId }, "No S3 snapshot found (new board)");
        return null;
      }

      logger.error({ error, boardId }, "S3 getLatestSnapshot failed");
      throw error;
    }
  },

  /**
   * Put snapshot to S3 with metadata
   *
   * **Metadata:** streamId (for MINID trimming), timestamp, size, reason
   */
  async putSnapshot(
    boardId: string,
    data: Uint8Array,
    metadata: {
      streamId: string;
      timestamp: string;
      size?: string;
      reason?: string;
    },
    isLatest: boolean = false
  ): Promise<void> {
    const key = isLatest
      ? WhiteboardKeys.S3SnapshotLatest(boardId)
      : WhiteboardKeys.S3SnapshotTimestamped(boardId, Date.now());

    try {
      const command = new PutObjectCommand({
        Bucket: env.S3_WHITEBOARD_BUCKET,
        Key: key,
        Body: Buffer.from(data),
        ContentType: "application/octet-stream",
        Metadata: metadata,
        StorageClass: "STANDARD",
      });

      await awsS3Client.send(command);

      logger.info(
        { boardId, key, size: data.length, streamId: metadata.streamId },
        "S3 snapshot written"
      );
    } catch (error) {
      logger.error({ error, boardId, key }, "S3 putSnapshot failed");
      throw error;
    }
  },
};
