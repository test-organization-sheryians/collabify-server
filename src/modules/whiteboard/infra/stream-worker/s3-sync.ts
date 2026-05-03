import { createLogger } from "@/shared/lib/logger";
import { s3Client } from "../s3-client";

const logger = createLogger("whiteboard:stream-worker-v2:s3-sync");

/**
 * S3 Sync Manager - Simplified
 *
 * Only syncs latest.yjs to S3 when threshold is met.
 * Historical snapshots are handled separately via manual user request.
 */

const S3_RETRY_ATTEMPTS = 3;
const S3_RETRY_DELAY_MS = 1000;

/**
 * Sync latest snapshot to S3 with retries
 */
export async function syncLatestToS3(
  boardId: string,
  snapshot: Uint8Array,
  streamId: string
): Promise<void> {
  let attempt = 0;

  while (attempt < S3_RETRY_ATTEMPTS) {
    try {
      await s3Client.putSnapshot(
        boardId,
        snapshot,
        {
          streamId,
          timestamp: new Date().toISOString(),
          size: snapshot.length.toString(),
        },
        true // isLatest = true (overwrites latest.yjs)
      );

      logger.info("✅ S3 latest.yjs synced", {
        boardId,
        streamId,
        size: snapshot.length,
      });

      return; // Success
    } catch (s3Error) {
      attempt++;

      logger.warn(
        `⚠️  S3 sync failed (attempt ${attempt}/${S3_RETRY_ATTEMPTS})`,
        {
          boardId,
          error: s3Error,
        }
      );

      if (attempt < S3_RETRY_ATTEMPTS) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, S3_RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries failed - log error
  logger.error("❌ S3 sync failed after retries", {
    boardId,
    attempts: S3_RETRY_ATTEMPTS,
  });

  throw new Error("S3 sync failed");
}
