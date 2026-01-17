import { Queue, type QueueOptions, type ConnectionOptions } from "bullmq";
import { createConnection } from "./connection";

import { logger } from "@/shared/logger";

export const createQueue = <T = unknown>(
  name: string,
  options?: QueueOptions
) => {
  logger.info({ queue: name }, "Queue initialized");

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
    logger.error({ err, queue: name }, "Queue Connection Error");
    // We don't throw here access process.exit usually handled by BullMQ retry logic
    // But we log it as a structured error for observability
  });

  return queue;
};
