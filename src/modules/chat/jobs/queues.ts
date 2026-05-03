import { createQueue } from "@/services/bullmq/queue.factory";

/**
 * Shared Queue Instances
 *
 * These queues are used across the chat module:
 * - persistenceQueue:    For new message persistence (chat-persistence worker)
 * - maintenanceQueue:    For cron jobs (cleanup, recovery)
 * - reactionQueue:       For async reaction persistence (batched)
 * - readReceiptQueue:    For async read receipt persistence (batched)
 * - messageEditQueue:    For edit-message persistence (persist-message-edit worker)
 * - messageDeleteQueue:  For delete-message persistence (persist-message-delete worker)
 */

export const persistenceQueue = createQueue("chat-persistence");

export const maintenanceQueue = createQueue("chat-maintenance");

export const reactionQueue = createQueue("chat-reactions");

export const readReceiptQueue = createQueue("chat-read-receipts");

// Separate queues so edit/delete jobs are not processed by the new-message worker
export const messageEditQueue = createQueue("persist-message-edit");

export const messageDeleteQueue = createQueue("persist-message-delete");
