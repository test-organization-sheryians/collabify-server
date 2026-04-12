import { createWorker } from "@/services/bullmq";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { QUEUE_NAMES, CONCURRENCY } from "../constants";
import { createLogger } from "@/shared/lib/logger";
import { notifDebug } from "../shared/debug/notification-debug";
import * as registry from "../events/registry";
import * as idempotencyGuard from "../shared/idempotency/idempotency-guard";
import * as rateLimiter from "../shared/rate-limit/rate-limiter";
import * as presenceChecker from "../shared/presence/presence-checker";
import * as preferenceResolver from "../shared/preferences/preference-resolver";
import * as fanoutEngine from "../shared/fanout/fanout-engine";
import * as batchEngine from "../shared/batching/batch-engine";
import {
  emailQueue,
  inAppQueue,
  pushQueue,
  realtimeQueue,
} from "../shared/queues/queue-registry";
import type {
  DeciderJobData,
  EmailJobData,
  InAppJobData,
  PushJobData,
  RealtimeJobData,
  Channel,
  Recipient,
  EventDefinition,
  NotificationHandler,
  HandlerContext,
} from "../events/types";
import type { NotificationContext } from "../shared/preferences/preference-types";

// =============================================================================
// Decider Worker (Phase 5.1)
//
// The core orchestration worker. Receives every outbox event and decides:
//   - Is this event known? (registry lookup → DLQ if not)
//   - Is the payload valid? (Zod schema → DLQ if invalid)
//   - Is it a duplicate at the decider level? (idempotency guard)
//   - Who are the recipients? (handler.resolveRecipients)
//   - Fan-out or single delivery?
//   - Rate limit check
//   - Preference resolution (preference-resolver → active channels)
//   - Should it be batched? (batch engine)
//   - Dispatch to channel queues
//
// Anti-patterns enforced:
//   - NO `if (type === '...')` logic anywhere in this file.
//   - All per-event logic lives in NotificationHandler implementations.
//   - This worker only reads pure data from EventDefinition + calls handler methods.
// =============================================================================

const logger = createLogger("notification:engine:decider");

export const createDeciderWorker = () =>
  createWorker<DeciderJobData>(
    QUEUE_NAMES.DECIDER,
    async (job) => {
      const { eventId, type, payload: rawPayload } = job.data;

      logger.debug("Decider: processing", { jobId: job.id, eventId, type });

      // ── 1. Registry lookup ───────────────────────────────────────────────
      const entry = registry.get(type);
      if (!entry) {
        logger.warn("Decider: unknown event type — dropping to DLQ", { type, eventId });
        return; // BullMQ marks as complete — unknown events are not retried
      }
      const { definition, handler } = entry;

      // ── 2. Payload validation ────────────────────────────────────────────
      const parsed = definition.payloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        logger.error("Decider: invalid payload — dropping", {
          type,
          eventId,
          errors: parsed.error.format(),
        });
        return; // Malformed payloads won't be fixed by retrying
      }
      const payload = parsed.data as Record<string, unknown>;

      // ── 3. Decider-level idempotency ─────────────────────────────────────
      const allowed = await idempotencyGuard.check(eventId, "decider");
      if (!allowed) {
        logger.debug("Decider: duplicate event dropped", { eventId, type });
        return;
      }

      // ── 4. Resolve recipients ─────────────────────────────────────────────
      const handlerCtx = { db, redis, logger };
      const recipients: Recipient[] = await handler.resolveRecipients(payload, handlerCtx);

      if (recipients.length === 0) {
        logger.debug("Decider: no recipients resolved — skipping", { eventId, type });
        notifDebug.drop({ stage: "DECIDER", type, eventId, reason: "no recipients resolved" });
        return;
      }

      notifDebug.decider({ type, eventId, recipientCount: recipients.length, recipientMode: definition.recipientMode });

      // ── 5. Fan-out or single ─────────────────────────────────────────────
      if (definition.recipientMode === "fan-out" && recipients.length > 50) {
        // Too many recipients to process inline — dispatch FanoutWorker chunks
        await fanoutEngine.dispatch({
          eventId,
          type,
          payload,
          recipients,
        });
        logger.debug("Decider: dispatched fan-out", {
          eventId,
          type,
          recipients: recipients.length,
        });
        return;
      }

      // ── 6. Process each recipient inline (single or small fan-out) ────────
      // Extract context from payload (convention: handlers put context fields at top level)
      const context: NotificationContext = {
        workspaceId:      payload.workspaceId as string | undefined,
        projectId:        payload.projectId   as string | undefined,
        conversationId:   payload.conversationId as string | undefined,
        conversationType: payload.conversationType as NotificationContext["conversationType"],
      };

      await Promise.all(
        recipients.map((recipient) =>
          deliverToRecipient({
            eventId,
            type,
            payload,
            recipient,
            definition,
            handler,
            context,
            handlerCtx,
          })
        )
      );
    },
    { concurrency: CONCURRENCY.DECIDER }
  );

// -----------------------------------------------------------------------------
// Per-recipient delivery pipeline
// -----------------------------------------------------------------------------

async function deliverToRecipient(params: {
  eventId:    string;
  type:       string;
  payload:    Record<string, unknown>;
  recipient:  Recipient;
  definition: EventDefinition;
  handler:    NotificationHandler;
  context:    NotificationContext;
  handlerCtx: HandlerContext;
}): Promise<void> {
  const { eventId, type, payload, recipient, definition, handler, context, handlerCtx } = params;
  const userId = recipient.userId;

  if (!userId) {
    // External invitee — email-only, skip preference resolution
    await dispatchEmail(eventId, type, payload, recipient, definition, handler);
    return;
  }

  // ── Rate limit ─────────────────────────────────────────────────────────
  if (!definition.skipRateLimit && definition.rateLimit) {
    const withinLimit = await rateLimiter.check(userId, type, definition.rateLimit, payload);
    if (!withinLimit) {
      logger.debug("Decider: rate limited — dropping", { eventId, userId, type });
      notifDebug.drop({ stage: "RECIPIENT", type, eventId, userId, reason: "rate limited" });
      return;
    }
  }

  // ── Staleness check ────────────────────────────────────────────────────
  if (handler.shouldDeliver) {
    const fresh = await handler.shouldDeliver(payload, recipient, handlerCtx);
    if (!fresh) {
      logger.debug("Decider: staleness check — notification no longer relevant", {
        eventId,
        type,
        userId,
      });
      notifDebug.drop({ stage: "RECIPIENT", type, eventId, userId, reason: "staleness check failed" });
      return;
    }
  }

  // ── Preference resolution ──────────────────────────────────────────────
  const isOnline  = await presenceChecker.isOnline(userId);
  const resolution = await preferenceResolver.resolve(userId, definition, context, isOnline);

  if (!resolution.deliver) {
    logger.debug("Decider: delivery suppressed by preferences", {
      eventId,
      type,
      userId,
      reason: resolution.reason,
    });
    notifDebug.drop({ stage: "RECIPIENT", type, eventId, userId, reason: `preference suppressed: ${resolution.reason}` });
    return;
  }

  notifDebug.recipient({ type, eventId, userId, activeChannels: resolution.activeChannels });

  const idempotencyKey = `${eventId}:${userId}`;

  // ── Step 3.12: Batching ────────────────────────────────────────────────
  // If the definition has a batching config, route batchable channels through
  // BatchEngine. REALTIME is always dispatched immediately (no batching).
  if (definition.batching) {
    const { groupBy } = definition.batching;
    const groupByValue = String(payload[groupBy] ?? "default");

    const batchEntry = {
      eventId,
      recipientUserId: userId,
      payload,
      enqueuedAt: Date.now(),
    };

    await batchEngine.enqueue(type, definition.batching, batchEntry, groupByValue);

    // REALTIME channel still fires immediately for online users
    if (resolution.activeChannels.includes("REALTIME")) {
      await dispatchToChannel("REALTIME", {
        eventId,
        type,
        payload,
        recipient: { ...recipient, userId },
        definition,
        handler,
        idempotencyKey,
      });
    }
    return; // batchable channels handled by BatchWorker
  }

  // ── Step 3.13: Direct dispatch to active channels ──────────────────────
  await Promise.all(
    resolution.activeChannels.map((channel: Channel) =>
      dispatchToChannel(channel, {
        eventId,
        type,
        payload,
        recipient: { ...recipient, userId },
        definition,
        handler,
        idempotencyKey,
      })
    )
  );
}

// -----------------------------------------------------------------------------
// Per-channel dispatch
// -----------------------------------------------------------------------------

async function dispatchToChannel(
  channel: Channel,
  ctx: {
    eventId:        string;
    type:           string;
    payload:        Record<string, unknown>;
    recipient:      Required<Recipient>;
    definition:     EventDefinition;
    handler:        NotificationHandler;
    idempotencyKey: string;
  }
): Promise<void> {
  const { eventId, type, payload, recipient, definition, handler, idempotencyKey } = ctx;
  // recipient.userId is guaranteed non-null here — callers always pass Required<Recipient> with
  // a userId guard applied before reaching dispatchToChannel.
  const userId: string = recipient.userId!;

  switch (channel) {
    case "EMAIL": {
      await dispatchEmail(eventId, type, payload, recipient, definition, handler);
      break;
    }

    case "IN_APP": {
      const content = await handler.buildInApp?.(payload, recipient);
      if (!content) {
        notifDebug.drop({ stage: "DISPATCH", type, eventId, userId: userId ?? undefined, reason: "buildInApp returned undefined" });
        return;
      }

      const jobData: InAppJobData = {
        eventId,
        type,
        recipientUserId: userId!,
        content,
        idempotencyKey,
      };
      await inAppQueue.add(`inapp:${eventId}:${userId}`, jobData);
      notifDebug.dispatch({ type, eventId, userId, channel: "IN_APP" });
      break;
    }

    case "PUSH": {
      const content = await handler.buildPush?.(payload, recipient);
      if (!content) {
        notifDebug.drop({ stage: "DISPATCH", type, eventId, userId: userId ?? undefined, reason: "buildPush returned undefined" });
        return;
      }

      const jobData: PushJobData = {
        eventId,
        recipientUserId: userId!,
        content,
        idempotencyKey,
      };
      await pushQueue.add(`push:${eventId}:${userId}`, jobData);
      notifDebug.dispatch({ type, eventId, userId, channel: "PUSH" });
      break;
    }

    case "REALTIME": {
      const content = await handler.buildRealtime?.(payload, recipient);
      if (!content) {
        notifDebug.drop({ stage: "DISPATCH", type, eventId, userId: userId ?? undefined, reason: "buildRealtime returned undefined" });
        return;
      }

      const jobData: RealtimeJobData = {
        eventId,
        recipientUserId: userId!,
        content,
        idempotencyKey,
      };
      await realtimeQueue.add(`rt:${eventId}:${userId}`, jobData);
      notifDebug.dispatch({ type, eventId, userId, channel: "REALTIME" });
      break;
    }
  }
}

async function dispatchEmail(
  eventId:   string,
  type:      string,
  payload:   Record<string, unknown>,
  recipient: Recipient,
  definition: EventDefinition,
  handler:   NotificationHandler
): Promise<void> {
  const content = await handler.buildEmail?.(payload, recipient);
  if (!content) return;

  const userId = recipient.userId;
  const jobData: EmailJobData = {
    eventId,
    recipientUserId: userId,
    content,
    idempotencyKey: `${eventId}:${userId ?? recipient.email}`,
  };
  await emailQueue.add(`email:${eventId}:${userId ?? recipient.email}`, jobData);
  notifDebug.dispatch({ type, eventId, userId: userId ?? recipient.email ?? "external", channel: "EMAIL" });
}
