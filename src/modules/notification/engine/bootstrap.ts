import { logger } from "@/shared/logger";
import { OutboxPoller } from "./outbox-poller";
import { createDeciderWorker } from "./decider.worker";
// Import other workers if they exist and are needed
// import { createFanOutWorker } from "./fan-out.worker";
// import { createBatchWorker } from "./batch.worker";
// import { createEmailWorker } from "./channels/email.worker";
// etc.

export const startEngine = async () => {
  logger.info("🔧 Initializing Notification Engine...");

  // 1. Start Workers
  createDeciderWorker();
  // createFanOutWorker();
  // createBatchWorker();
  // ... others

  // 2. Start Outbox Poller
  await OutboxPoller.start();

  logger.info("✅ Notification Engine Running");
};
