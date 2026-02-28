import { subRedis } from "../redis";
import { wsRegistry } from "./subscription-registry";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("infra:ws:worker");

/**
 * Redis Subscriber (The "Edge" Listener)
 *
 * Responsibilities:
 * 1. Maintain ONE Redis connection for all subscriptions.
 * 2. Subscribe/Unsubscribe dynamically based on Registry RefCount.
 * 3. Receive messages and dispatch to Registry for Fan-Out.
 */

export const redisSubscriber = {
  /**
   * Initialize Global Listener
   * Should be called on server boot.
   */
  async init() {
    subRedis.on("message", (channel, message) => {
      // Parse message format:
      // New: { message: "...", originSocketId: "socket-123" }
      // Old: "plain string" (chat module, backward compatible)
      try {
        const parsed = JSON.parse(message);

        // Check if new format with originSocketId
        if (parsed.message && typeof parsed.message === "string") {
          const actualMessage = parsed.message;
          const excludeSocketId = parsed.originSocketId;
          wsRegistry.dispatch(channel, actualMessage, excludeSocketId);
        } else {
          // Parsed but not our format, treat as plain string
          wsRegistry.dispatch(channel, message);
        }
      } catch (err) {
        // Not JSON, treat as plain string (chat module)
        wsRegistry.dispatch(channel, message);
      }
    });

    logger.info("RedisSubscriber initialized");
  },

  /**
   * Subscribe to a Topic
   * Called by Registry when RefCount 0 -> 1
   */
  async subscribe(topic: string) {
    logger.debug("Subscribing to Redis channel", { topic });
    await subRedis.subscribe(topic);
  },

  /**
   * Unsubscribe from a Topic
   * Called by Registry when RefCount 1 -> 0
   */
  async unsubscribe(topic: string) {
    logger.debug("Unsubscribing from Redis channel", { topic });
    await subRedis.unsubscribe(topic);
  },
};
