import type {
  ThresholdChecker,
  ThresholdContext,
  ThresholdConfig,
} from "./index";
import { WhiteboardKeys } from "../../whiteboard-keys";
import { createLogger } from "@/shared/lib/logger";
import { THRESHOLDS } from "../config";

const logger = createLogger("whiteboard:threshold:stream-length");

/**
 * Stream Length Threshold Checker
 *
 * Triggers snapshot when stream exceeds maximum length.
 * Uses XINFO STREAM to check current stream size.
 */
export class StreamLengthThreshold implements ThresholdChecker {
  readonly name = "stream-length";

  constructor(
    private maxLength: number = THRESHOLDS.STREAM_LENGTH.maxLength,
    private enabled: boolean = THRESHOLDS.STREAM_LENGTH.enabled
  ) {}

  async evaluate(context: ThresholdContext): Promise<boolean> {
    try {
      const streamKey = WhiteboardKeys.BoardStream(context.boardId);

      // Use XLEN for accurate, real-time stream entry count
      // (XINFO STREAM can have race conditions with consumer groups)
      const currentLength = await context.redis.xlen(streamKey);

      const shouldTrigger = currentLength >= this.maxLength;

      if (shouldTrigger) {
        logger.info("📏 Stream length threshold met", {
          boardId: context.boardId,
          currentLength,
          maxLength: this.maxLength,
        });
      } else {
        logger.debug("Stream length check", {
          boardId: context.boardId,
          currentLength,
          maxLength: this.maxLength,
        });
      }

      return shouldTrigger;
    } catch (error) {
      logger.error("❌ Failed to evaluate stream length threshold", {
        boardId: context.boardId,
        error,
      });
      return false; // Don't trigger on error
    }
  }

  getConfig(): ThresholdConfig & { maxLength: number } {
    return {
      enabled: this.enabled,
      name: this.name,
      description: `Trigger snapshot when stream length >= ${this.maxLength}`,
      maxLength: this.maxLength,
    };
  }
}
