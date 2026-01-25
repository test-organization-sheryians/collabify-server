import { subRedis } from "../redis";
import { wsRegistry } from "./subscription-registry";
import { logger } from "@/shared/logger";

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
      // 1. Dispatch Logic (No business logic here, just transport)
      // The "channel" here corresponds to the Topic.
      wsRegistry.dispatch(channel, message);
    });

    logger.info("RedisSubscriber initialized");
  },

  /**
   * Subscribe to a Topic
   * Called by Registry when RefCount 0 -> 1
   */
  async subscribe(topic: string) {
    logger.debug({ topic }, "Subscribing to Redis channel");
    await subRedis.subscribe(topic);
  },

  /**
   * Unsubscribe from a Topic
   * Called by Registry when RefCount 1 -> 0
   */
  async unsubscribe(topic: string) {
    logger.debug({ topic }, "Unsubscribing from Redis channel");
    await subRedis.unsubscribe(topic);
  },
};
