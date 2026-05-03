import {
  Worker,
  type Processor,
  type WorkerOptions,
  type ConnectionOptions,
} from "bullmq";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { createConnection } from "./connection";

const logger = createLogger("services:bullmq");

export const createWorker = <T = unknown>(
  name: string,
  processor: Processor<T>,
  options?: Omit<WorkerOptions, "connection">
) => {
  logger.info("Worker initializing...", { worker: name });

  const worker = new Worker<T>(name, processor, {
    connection: createConnection() as unknown as ConnectionOptions,
    ...options,
  });

  worker.on("ready", () => {
    logger.info("Worker ready to process jobs", { worker: name });
  });

  worker.on("failed", (job, err) => {
    // Standardized Error Logging
    if (err instanceof AppError) {
      logger.error(`Worker job failed: ${err.message}`, {
        worker: name,
        jobId: job?.id,
        code: err.code,
        meta: err.metadata,
        operational: err.isOperational,
      });
    } else {
      logger.error("Worker job failed (Unknown Error)", {
        worker: name,
        jobId: job?.id,
        err,
      });
    }
  });

  worker.on("error", (err) => {
    logger.error("Worker encountered an error", { worker: name, err });
  });

  return worker;
};
