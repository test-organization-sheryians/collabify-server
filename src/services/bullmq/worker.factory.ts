import {
  Worker,
  type Processor,
  type WorkerOptions,
  type ConnectionOptions,
} from "bullmq";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { createConnection } from "./connection";

export const createWorker = <T = unknown>(
  name: string,
  processor: Processor<T>,
  options?: Omit<WorkerOptions, "connection">
) => {
  logger.info({ worker: name }, "Worker initializing...");

  const worker = new Worker<T>(name, processor, {
    connection: createConnection() as unknown as ConnectionOptions,
    ...options,
  });

  worker.on("ready", () => {
    logger.info({ worker: name }, "Worker ready to process jobs");
  });

  worker.on("failed", (job, err) => {
    // Standardized Error Logging
    if (err instanceof AppError) {
      logger.error(
        {
          worker: name,
          jobId: job?.id,
          code: err.code,
          meta: err.metadata,
          operational: err.isOperational,
        },
        `Worker job failed: ${err.message}`
      );
    } else {
      logger.error(
        { worker: name, jobId: job?.id, err },
        "Worker job failed (Unknown Error)"
      );
    }
  });

  worker.on("error", (err) => {
    logger.error({ worker: name, err }, "Worker encountered an error");
  });

  return worker;
};
