import { createWorker } from "@/services/bullmq/worker.factory";
import { persistMessageHandler } from "./persist-message";

export const startChatWorkers = () => {
  // Persistence Worker (Critical for Chat Arch)
  createWorker("chat-persistence", persistMessageHandler, {
    concurrency: 5, // Process 5 messages in parallel
  });
};
