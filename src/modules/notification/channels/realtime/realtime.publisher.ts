import { redis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";
import type { RealtimeContent } from "../../events/types";

const logger = createLogger("notification:channel:realtime:publisher");

// =============================================================================
// Realtime Publisher
//
// Single abstraction for Redis PUBLISH to the `user:{userId}` channel.
// The WS Gateway's redis-subscriber receives the message and dispatches
// it to the user's connected socket(s) via wsRegistry.dispatch().
//
// Channel format: `user:{userId}`
// Message format: { type, data, timestamp }
// =============================================================================

/**
 * Publish a real-time notification to all of a user's connected sockets.
 * Best-effort — returns false if Redis publish fails (InApp is the guarantee).
 */
export async function publish(
  recipientUserId: string,
  content: RealtimeContent
): Promise<boolean> {
  const channel = `user:${recipientUserId}`;
  const message = JSON.stringify({
    type:      content.eventType,
    data:      content.data,
    timestamp: new Date().toISOString(),
  });

  try {
    const subscriberCount = await redis.publish(channel, message);

    logger.debug("Realtime: published", {
      channel,
      wsEvent:         content.eventType,
      subscriberCount,
    });

    return true;
  } catch (err) {
    logger.warn("Realtime: publish failed", { err, channel });
    return false;
  }
}
