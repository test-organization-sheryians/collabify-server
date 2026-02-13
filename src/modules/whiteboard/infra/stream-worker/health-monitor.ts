import { appRedis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import { WhiteboardKeys } from "../whiteboard-keys";
import { HEALTH_THRESHOLDS } from "./config";

const logger = createLogger("whiteboard:stream-worker:health");

/**
 * Stream Health Monitor
 *
 * Monitors stream health and applies backpressure thresholds
 */

/**
 * Monitor stream health and apply backpressure if needed
 */
export async function monitorStreamHealth(
  streamKey: string,
  boardId: string
): Promise<void> {
  try {
    const length = await appRedis.xlen(streamKey);

    if (length > HEALTH_THRESHOLDS.DANGER) {
      logger.error("DANGER: Circuit breaker threshold", { boardId, length });
      await appRedis.set(
        WhiteboardKeys.BoardCircuitBreaker(boardId),
        "OPEN",
        "EX",
        30
      );
    } else if (length > HEALTH_THRESHOLDS.CRITICAL) {
      logger.warn("CRITICAL: Stream backlog high", { boardId, length });
    } else if (length > HEALTH_THRESHOLDS.WARNING) {
      logger.info("WARNING: Stream approaching threshold", {
        boardId,
        length,
      });
    }
  } catch (error) {
    logger.error("Stream health check failed", { error, boardId });
  }
}
