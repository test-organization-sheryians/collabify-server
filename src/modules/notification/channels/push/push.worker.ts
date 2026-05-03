import { createWorker } from "@/services/bullmq";
import { pushProvider } from "@/services/push-provider";
import { QUEUE_NAMES, CONCURRENCY } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import * as idempotencyGuard from "../../shared/idempotency/idempotency-guard";
import type { PushJobData } from "../../events/types";
import { notifDebug } from "../../shared/debug/notification-debug";

// =============================================================================
// Push Worker (Phase 4.3)
//
// Processes PushQueue jobs. Responsibilities:
//   1. Idempotency check (channel-scoped: push:{eventId}:{userId})
//   2. Send via pushProvider (console adapter by default — FCM when configured)
//
// Token management will be added here when a device token registry is built.
// For now pushProvider.send() receives the userId and resolves tokens internally
// (or logs to console in dev).
// =============================================================================

const logger = createLogger("notification:channel:push");

export const createPushWorker = () =>
  createWorker<PushJobData>(
    QUEUE_NAMES.PUSH,
    async (job) => {
      const { eventId, recipientUserId, content } = job.data;

      // ── 1. Idempotency ───────────────────────────────────────────────────
      const allowed = await idempotencyGuard.check(eventId, "push", recipientUserId);
      if (!allowed) {
        logger.debug("Push job: duplicate dropped", { eventId, recipientUserId });
        return;
      }

      // ── 2. Send ──────────────────────────────────────────────────────────
      logger.debug("Push job: sending", {
        jobId:  job.id,
        eventId,
        userId: recipientUserId,
        title:  content.title,
      });

      try {
        // pushProvider accepts (userIds[], title, body, data)
        await pushProvider.send(
          [recipientUserId],
          content.title,
          content.body,
          content.data
        );

        logger.info("Push job: delivered", { eventId, userId: recipientUserId });
        notifDebug.channel({ channel: "PUSH", eventId, userId: recipientUserId, extra: { title: content.title } });
      } catch (err) {
        logger.error("Push job: delivery failed", { err, eventId, userId: recipientUserId });
        throw err; // BullMQ will retry
      }
    },
    { concurrency: CONCURRENCY.PUSH }
  );
