import { Queue, type QueueOptions, type ConnectionOptions } from "bullmq";
import { createConnection } from "./connection";

import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:bullmq");

export const createQueue = <T = unknown>(
  name: string,
  options?: QueueOptions
) => {
  logger.info("Queue initialized", { queue: name });

  const queue = new Queue<T>(name, {
    connection: createConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: true, // Auto-cleanup success
      removeOnFail: false, // Keep failure for DLQ inspection
    },
    ...options,
  });

  queue.on("error", (err) => {
    logger.error("Queue Connection Error", { err, queue: name });
    // We don't throw here access process.exit usually handled by BullMQ retry logic
    // But we log it as a structured error for observability
  });

  return queue;
};
