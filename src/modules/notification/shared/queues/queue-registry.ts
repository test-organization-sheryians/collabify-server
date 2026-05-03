import { createQueue } from "@/services/bullmq/queue.factory";
import { QUEUE_NAMES } from "../../constants";
import type {
  DeciderJobData,
  FanoutJobData,
  BatchJobData,
  EmailJobData,
  InAppJobData,
  PushJobData,
  RealtimeJobData,
} from "../../events/types";

// =============================================================================
// Notification Module — BullMQ Queue Registry
//
// All queue instances are created once here and exported.
// No other file in this module calls createQueue() directly.
// =============================================================================

/** Receives outbox events from OutboxPoller/Listener. Orchestrates delivery. */
export const deciderQueue = createQueue<DeciderJobData>(QUEUE_NAMES.DECIDER);

/** Fan-out jobs: chunks of recipients dispatched by DeciderWorker. */
export const fanoutQueue = createQueue<FanoutJobData>(QUEUE_NAMES.FANOUT);

/**
 * Batch accumulation flush jobs.
 * Created as delayed jobs by BatchEngine — fires after batch window expires.
 */
export const batchQueue = createQueue<BatchJobData>(QUEUE_NAMES.BATCH);

/** Email delivery jobs — processed by EmailWorker → SES. */
export const emailQueue = createQueue<EmailJobData>(QUEUE_NAMES.EMAIL);

/** In-app notification write jobs — processed by InAppWorker → Postgres. */
export const inAppQueue = createQueue<InAppJobData>(QUEUE_NAMES.IN_APP);

/** Push notification delivery jobs — processed by PushWorker → FCM. */
export const pushQueue = createQueue<PushJobData>(QUEUE_NAMES.PUSH);

/** Real-time WS push jobs — processed by RealtimeWorker → Redis PUBLISH. */
export const realtimeQueue = createQueue<RealtimeJobData>(QUEUE_NAMES.REALTIME);
