import { startChatWorkers } from "./jobs";
import { streamWorker } from "@/infra/ws/stream-worker";
import { redisSubscriber } from "@/infra/ws/redis-subscriber";
import { logger } from "@/shared/logger";
import { workerCoordinator } from "@/infra/ws/worker-coordinator";

// Export GraphQL parts for Schema Stitching
export { typeDefs as chatTypeDefs } from "./graphql/type-defs";
export { resolvers as chatResolvers } from "./graphql/resolvers";
export { createChatLoaders } from "./loaders/index";

export const ChatModule = {
  /**
   * Start the Chat Engine (Background Processes)
   */
  startEngine: async () => {
    logger.info("Starting Chat Module Engine...");

    // 1. Start BullMQ Workers
    startChatWorkers();

    // 2. Start Coordinator (The Brain)
    await workerCoordinator.init();

    // 3. Start Stream Worker (The Bridge)
    await streamWorker.init();

    // 4. Start Redis Subscriber (The Edge)
    await redisSubscriber.init();

    logger.info("Chat Module Engine Started");
  },
};
