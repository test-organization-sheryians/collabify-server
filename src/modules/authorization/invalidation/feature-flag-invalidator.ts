/**
 * feature-flag-invalidator.ts
 *
 * Stage 5 — Cache invalidation for FeatureFlagEngine.
 *
 * Called by the toggle-feature-flag mutation after writing an override
 * to ensure the Redis cache reflects the new value immediately.
 */
import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import type { OutboundEnvelope } from "@/infra/ws/types";

const logger = createLogger("authorization:feature-flag-invalidator");


function cacheKey(flagKey: string, contextType: string, contextId: string): string {
  return `flag:${flagKey}:${contextType}:${contextId}`;
}

export class FeatureFlagInvalidator {
  constructor(private readonly redis: Redis) {}

  /**
   * Invalidate cache for a specific flag+context combination.
   * Call this immediately after writing a FeatureFlagOverride.
   */
  async invalidate(
    flagKey: string,
    contextType: "USER" | "PROJECT" | "WORKSPACE" | "GLOBAL",
    contextId: string
  ): Promise<void> {
    const key = cacheKey(flagKey, contextType, contextId);
    await this.redis.del(key);
    logger.debug("Feature flag cache invalidated", { flagKey, contextType, contextId });
  }

  /**
   * Invalidate all cached entries for a flag across all contexts.
   * Used when a flag's defaultEnabled is changed.
   * Note: Uses SCAN — only call for admin-level operations, not hot paths.
   */
  async invalidateAll(flagKey: string): Promise<void> {
    const pattern = `flag:${flagKey}:*`;
    let cursor = "0";
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== "0");

    logger.debug("Feature flag cache fully invalidated", { flagKey, deleted });
  }

  /**
   * Notify specific users over WS that their feature flag cache is stale.
   * Call this after invalidate() when you know which users are affected.
   *
   * Scope rules:
   *   WORKSPACE override → pass all workspace member userIds
   *   PROJECT override   → pass all project member userIds
   *   USER override      → pass [contextId] (contextId is the userId)
   *   GLOBAL override    → omit (no targeted sockets; client refetches on next staleTime expiry)
   */
  notifyUsers(userIds: string[]): void {
    if (userIds.length === 0) return;
    const frame: OutboundEnvelope = {
      type: "flags.invalidated",
      data: {},
    };
    const message = JSON.stringify(frame);
    for (const userId of userIds) {
      wsRegistry.sendToUser(userId, message);
    }
    logger.debug("flags.invalidated WS event sent", { count: userIds.length });
  }
}
