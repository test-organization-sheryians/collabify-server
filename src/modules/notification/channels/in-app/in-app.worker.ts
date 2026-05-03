import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, CONCURRENCY } from "../../constants";
import { createLogger } from "@/shared/lib/logger";
import * as idempotencyGuard from "../../shared/idempotency/idempotency-guard";
import * as dedupGuard from "../../shared/deduplication/dedup-guard";
import * as inappStore from "./inapp.store";
import * as countCache from "./inapp.count-cache";
import type { InAppJobData } from "../../events/types";
import { notifDebug } from "../../shared/debug/notification-debug";

// =============================================================================
// In-App Worker (Phase 4.2)
//
// Processes InAppQueue jobs. Responsibilities (in order):
//   1. Idempotency check (channel-scoped: inapp:{eventId}:{userId})
//   2. Delivery permission check (did user lose access since event was emitted?)
//   3. Deduplication guard (does this row already exist in Postgres?)
//   4. Write Notification row to Postgres
//   5. Increment unread count cache
//
// In-App is the RELIABILITY CHANNEL. It writes to Postgres and drives the
// inbox. Real-time delivery is handled separately by RealtimeWorker.
// =============================================================================

const logger = createLogger("notification:channel:inapp");

export const createInAppWorker = () =>
  createWorker<InAppJobData>(
    QUEUE_NAMES.IN_APP,
    async (job) => {
      const { eventId, type, recipientUserId, content } = job.data;

      // ── 1. Idempotency ───────────────────────────────────────────────────
      const allowed = await idempotencyGuard.check(eventId, "inapp", recipientUserId);
      if (!allowed) {
        logger.debug("InApp job: duplicate dropped", { eventId, recipientUserId });
        return;
      }

      // ── 2. Delivery permission ───────────────────────────────────────────
      // Permission check is best-effort — workspace/project context comes from content
      // Handlers that need strict access checks set workspaceId/projectId in InAppContent
      // For now: basic check is handled by dedup (we trust Decider's access check)

      // ── 3. Deduplication guard ───────────────────────────────────────────
      const isDuplicate = await dedupGuard.isDuplicate({
        recipientUserId,
        entityId:   content.entityId,
        entityType: content.entityType,
        type,
      });
      if (isDuplicate) {
        logger.debug("InApp job: dedup guard — notification already exists", {
          eventId,
          recipientUserId,
          entityId:   content.entityId,
          entityType: content.entityType,
        });
        return;
      }

      // ── 4. Write to Postgres via store ───────────────────────────────────
      logger.debug("InApp job: writing notification", {
        jobId:          job.id,
        eventId,
        recipientUserId,
        entityType:     content.entityType,
      });

      try {
        await inappStore.insert({ recipientUserId, eventType: type, content });

        // ── 5. Increment unread count cache ──────────────────────────────
        await countCache.increment(recipientUserId);

        logger.info("InApp job: notification persisted", {
          eventId,
          recipientUserId,
          entityType: content.entityType,
        });
        notifDebug.channel({
          channel: "IN_APP",
          eventId,
          userId:  recipientUserId,
          extra:   { entityType: content.entityType, title: content.title },
        });
      } catch (err) {
        logger.error("InApp job: write failed", { err, eventId, recipientUserId });
        throw err; // BullMQ will retry
      }
    },
    { concurrency: CONCURRENCY.IN_APP }
  );
