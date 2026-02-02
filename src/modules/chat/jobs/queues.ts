import { createQueue } from "@/services/bullmq/queue.factory";

/**
 * Shared Queue Instances
 *
 * These queues are used across the chat module:
 * - persistenceQueue: For async message persistence
 * - maintenanceQueue: For cron jobs (cleanup, recovery)
 * - reactionQueue: For async reaction persistence (batched)
 * - readReceiptQueue: For async read receipt persistence (batched)
 */

export const persistenceQueue = createQueue("chat-persistence");

export const maintenanceQueue = createQueue("chat-maintenance");

export const reactionQueue = createQueue("chat-reactions");

export const readReceiptQueue = createQueue("chat-read-receipts");
