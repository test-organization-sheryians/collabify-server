import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, CONCURRENCY } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import type { RealtimeJobData } from "../../events/types";
import * as publisher from "./realtime.publisher";
import { notifDebug } from "../../shared/debug/notification-debug";

// =============================================================================
// Realtime Worker (Phase 4.4)
//
// Processes RealtimeQueue jobs. Delegates to realtime.publisher which
// calls redis.publish("user:{userId}"). The WS Gateway subscribes on
// connect and forwards the message to the user's socket(s).
//
// No idempotency check: realtime is best-effort. Duplicate WS pushes
// from retries are acceptable vs. the overhead of a SETNX per job.
// Durable delivery is guaranteed by InAppWorker independently.
// =============================================================================

const logger = createLogger("notification:channel:realtime");

export const createRealtimeWorker = () =>
  createWorker<RealtimeJobData>(
    QUEUE_NAMES.REALTIME,
    async (job) => {
      const { eventId, recipientUserId, content } = job.data;

      const ok = await publisher.publish(recipientUserId, content);

      if (!ok) {
        // publisher.publish() already logged the error.
        // Throw so BullMQ retries — retry cost is low for WS push.
        throw new Error(`Realtime publish failed for user ${recipientUserId}`);
      }

      logger.debug("Realtime job: done", {
        jobId:   job.id,
        eventId,
        userId:  recipientUserId,
        wsEvent: content.eventType,
      });
      notifDebug.channel({
        channel: "REALTIME",
        eventId,
        userId:  recipientUserId,
        extra:   { wsEvent: content.eventType },
      });
    },
    { concurrency: CONCURRENCY.REALTIME }
  );
