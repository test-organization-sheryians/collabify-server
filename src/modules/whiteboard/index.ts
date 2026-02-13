// Services (GraphQL mutations)
export * as services from "./services";

// Queries (GraphQL queries)
export * as queries from "./queries";

// GraphQL
export { resolvers as whiteboardResolvers } from "./graphql/resolvers";
export { typeDefs as whiteboardTypeDefs } from "./graphql/type-defs";

import { whiteboardStreamWorker } from "./infra/stream-worker";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:engine");

export const WhiteboardModule = {
  /**
   * Start the Whiteboard Engine (Background Processes)
   */
  startEngine: async () => {
    logger.info("Starting Whiteboard Module Engine");

    // Start Stream Worker (Y.js CRDT processor)
    await whiteboardStreamWorker.init();

    logger.info("Whiteboard Module Engine Started");
  },
};
