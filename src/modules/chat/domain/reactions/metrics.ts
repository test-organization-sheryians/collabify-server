import { appRedis } from "@/infra/redis";
import { logger } from "@/shared/logger";

/**
 * Track reaction system metrics
 */
export const trackReactionMetrics = async (): Promise<void> => {
  try {
    const info = await appRedis.info("stats");

    // Parse cache hit rate from Redis INFO output
    const keyspaceHitsMatch = info.match(/keyspace_hits:(\d+)/);
    const keyspaceMissesMatch = info.match(/keyspace_misses:(\d+)/);

    if (keyspaceHitsMatch && keyspaceMissesMatch) {
      const hits = parseInt(keyspaceHitsMatch[1], 10);
      const misses = parseInt(keyspaceMissesMatch[1], 10);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      logger.info(
        {
          cacheHitRate: hitRate.toFixed(2) + "%",
          hits,
          misses,
        },
        "Reaction cache metrics"
      );
    }
  } catch (error: any) {
    logger.error({ error }, "Failed to track reaction metrics");
  }
};

// Run metrics tracking every minute
let metricsInterval: NodeJS.Timeout | null = null;

export const startReactionMetrics = (): void => {
  if (metricsInterval) {
    return; // Already started
  }

  metricsInterval = setInterval(trackReactionMetrics, 60000);
  logger.info("Reaction metrics tracking started");
};

export const stopReactionMetrics = (): void => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info("Reaction metrics tracking stopped");
  }
};
