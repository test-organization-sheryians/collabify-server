import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, CONCURRENCY } from "../constants";
import { createLogger } from "@/shared/lib/logger";
import { flush } from "../shared/batching/batch-engine";
import * as registry from "../events/registry";
import * as presenceChecker from "../shared/presence/presence-checker";
import * as preferenceResolver from "../shared/preferences/preference-resolver";
import {
  emailQueue,
  inAppQueue,
  pushQueue,
} from "../shared/queues/queue-registry";
import type { BatchJobData, Channel, Recipient } from "../events/types";
import type { BatchEntry } from "../shared/batching/batch-types";
import type { NotificationContext } from "../shared/preferences/preference-types";

// =============================================================================
// Batch Worker (Phase 5.3)
//
// Processes BatchQueue jobs — these are delayed jobs created by BatchEngine
// after the accumulation window expires, or immediate jobs on maxSize trigger.
//
// Flow:
//   1. Call flush(batchKey) — atomically reads and clears the Redis Hash bucket.
//   2. If null (already flushed by concurrent job) — exit silently.
//   3. Group entries by recipientUserId.
//   4. Per-recipient: preference resolution → call handler.build*() with
//      `batched` array → dispatch to channel queues.
//
// The `batched` parameter lets handlers render digest-style content
// ("You have 5 new messages in #general") instead of single-event content.
// =============================================================================

const logger = createLogger("notification:engine:batch");

export const createBatchWorker = () =>
  createWorker<BatchJobData>(
    QUEUE_NAMES.BATCH,
    async (job) => {
      const { batchKey, eventType } = job.data;

      logger.debug("Batch worker: flushing", { jobId: job.id, batchKey, eventType });

      // ── 1. Atomic flush ──────────────────────────────────────────────────
      const entries = await flush(batchKey);
      if (!entries || entries.length === 0) {
        logger.debug("Batch worker: bucket already flushed — skipping", { batchKey });
        return;
      }

      logger.debug("Batch worker: flushed entries", {
        batchKey,
        count:  entries.length,
        type:   eventType,
      });

      // ── 2. Lookup registry entry ─────────────────────────────────────────
      const entry = registry.get(eventType);
      if (!entry) {
        logger.warn("Batch worker: unknown event type after flush", { eventType, batchKey });
        return;
      }
      const { definition, handler } = entry;

      // ── 3. Group entries by recipient ────────────────────────────────────
      const byRecipient = new Map<string, BatchEntry[]>();
      for (const e of entries) {
        const existing = byRecipient.get(e.recipientUserId) ?? [];
        existing.push(e);
        byRecipient.set(e.recipientUserId, existing);
      }

      // ── 4. Per-recipient: resolve prefs → dispatch with batched context──
      await Promise.all(
        Array.from(byRecipient.entries()).map(async ([userId, recipientEntries]) => {
          // Use the latest entry's payload as the "current" payload
          const latestEntry = recipientEntries[recipientEntries.length - 1];
          const payload = latestEntry.payload;
          const batchedPayloads = recipientEntries.map((e) => e.payload);

          const recipient: Recipient = { userId, email: null };

          const context: NotificationContext = {
            workspaceId:    payload.workspaceId    as string | undefined,
            projectId:      payload.projectId      as string | undefined,
            conversationId: payload.conversationId as string | undefined,
          };

          const isOnline  = await presenceChecker.isOnline(userId);
          const resolution = await preferenceResolver.resolve(userId, definition, context, isOnline);

          if (!resolution.deliver) return;

          const batchEventId = `batch:${batchKey}:${userId}`;
          const idempotencyKey = batchEventId;

          await Promise.all(
            resolution.activeChannels.map(async (channel: Channel) => {
              if (channel === "EMAIL") {
                const content = await handler.buildEmail?.(payload, recipient, batchedPayloads);
                if (!content) return;
                await emailQueue.add(`email:${batchEventId}`, {
                  eventId:         batchEventId,
                  recipientUserId: userId,
                  content,
                  idempotencyKey,
                });
              } else if (channel === "IN_APP") {
                const content = await handler.buildInApp?.(payload, recipient, batchedPayloads);
                if (!content) return;
                await inAppQueue.add(`inapp:${batchEventId}`, {
                  eventId:         batchEventId,
                  type:            eventType,
                  recipientUserId: userId,
                  content,
                  idempotencyKey,
                });
              } else if (channel === "PUSH") {
                const content = await handler.buildPush?.(payload, recipient, batchedPayloads);
                if (!content) return;
                await pushQueue.add(`push:${batchEventId}`, {
                  eventId:         batchEventId,
                  recipientUserId: userId,
                  content,
                  idempotencyKey,
                });
              }
              // REALTIME is never batched — real-time messages fire immediately one-by-one
            })
          );
        })
      );

      logger.info("Batch worker: batch delivered", {
        batchKey,
        eventType,
        recipients: byRecipient.size,
      });
    },
    { concurrency: CONCURRENCY.BATCH }
  );
