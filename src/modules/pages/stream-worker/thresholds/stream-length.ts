import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../infra/page-keys";
import { SNAPSHOT_THRESHOLD } from "../config";
import type {
  ThresholdChecker,
  ThresholdContext,
  ThresholdConfig,
} from "./index";

const logger = createLogger("pages:stream-worker:threshold:stream-length");

/**
 * StreamLengthThreshold — triggers snapshot when XLEN >= maxLength.
 *
 * Uses XLEN for accurate real-time count (not XINFO which can lag).
 * On error: returns false — never blocks snapshot on check failure.
 */
export class StreamLengthThreshold implements ThresholdChecker {
  readonly name = "stream-length";

  constructor(
    private readonly maxLength: number = SNAPSHOT_THRESHOLD,
    private readonly enabled: boolean = true
  ) {}

  async evaluate(ctx: ThresholdContext): Promise<boolean> {
    try {
      const streamKey = PageKeys.PageStream(ctx.pageId);
      const currentLength = await ctx.redis.xlen(streamKey);
      const shouldTrigger = currentLength >= this.maxLength;

      if (shouldTrigger) {
        logger.info("Stream length threshold met", {
          pageId: ctx.pageId,
          currentLength,
          maxLength: this.maxLength,
        });
      } else {
        logger.debug("Stream length check", {
          pageId: ctx.pageId,
          currentLength,
          maxLength: this.maxLength,
        });
      }

      return shouldTrigger;
    } catch (err) {
      logger.error("Stream length check failed — skipping trigger", {
        pageId: ctx.pageId,
        err,
      });
      return false;
    }
  }

  getConfig(): ThresholdConfig & { maxLength: number } {
    return {
      enabled: this.enabled,
      name: this.name,
      description: `Trigger snapshot when XLEN >= ${this.maxLength}`,
      maxLength: this.maxLength,
    };
  }
}
