import { FILES, GROUPS } from "@/shared/lib/debug-flags";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Notification Debug Console
//
// Structured, flag-gated debug instrumentation for the notification pipeline.
//
// Stages instrumented:
//   EMIT      → outbox-writer: event written to outbox
//   PICKUP    → outbox-poller: event picked up and enqueued to Decider
//   DECIDER   → decider.worker: event received, validated, recipients resolved
//   RECIPIENT → decider.worker: per-recipient processing (pref/dedup/rate-limit)
//   DISPATCH  → decider.worker: channel job enqueued
//   CHANNEL   → channel workers: job received and processed
//   DROP      → any stage where processing is suppressed (includes reason)
//
// Usage:
//   import { notifDebug } from "@/modules/notification/shared/debug/notification-debug";
//   notifDebug.emit({ type, eventId });
//   notifDebug.dispatch({ type, eventId, userId, channel });
//   // etc.
//
// Enable via debug-flags.ts:
//   "notification:debug": true   → per-file (highest priority)
//   GROUPS.notification = true   → whole module
//   ALL = true                   → everything
// =============================================================================

const logger = createLogger("notification:debug");

/** Returns true when debug logging is active for the notification pipeline. */
function isEnabled(): boolean {
  // Per-file flag has highest priority; falls back to module group and ALL.
  const fileFlag = FILES["notification:debug"];
  if (fileFlag !== undefined) return fileFlag;
  const groupFlag = GROUPS.notification;
  if (groupFlag !== undefined) return groupFlag;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ALL } = require("@/shared/lib/debug-flags") as { ALL: boolean };
  return ALL;
}

// =============================================================================
// Stage log methods
// Each method is a no-op when disabled — zero string-building overhead.
// =============================================================================

/** Stage 1 — Event written to NotificationOutbox. */
function emit(ctx: { type: string; eventId?: string; deduplicationId?: string }): void {
  if (!isEnabled()) return;
  logger.info("[NOTIF:EMIT] Event written to outbox", {
    stage:           "EMIT",
    eventType:        ctx.type,
    eventId:          ctx.eventId ?? "pending",
    deduplicationId: ctx.deduplicationId,
  });
}

/** Stage 2 — Event picked up by OutboxPoller and dispatched to DeciderQueue. */
function pickup(ctx: { type: string; eventId: string }): void {
  if (!isEnabled()) return;
  logger.info("[NOTIF:PICKUP] Event dispatched to DeciderQueue", {
    stage:     "PICKUP",
    eventType:  ctx.type,
    eventId:   ctx.eventId,
  });
}

/** Stage 3 — Decider received event, validated payload, resolved recipients. */
function decider(ctx: {
  type:           string;
  eventId:        string;
  recipientCount: number;
  recipientMode:  string;
}): void {
  if (!isEnabled()) return;
  logger.info("[NOTIF:DECIDER] Event received by Decider", {
    stage:          "DECIDER",
    eventType:       ctx.type,
    eventId:        ctx.eventId,
    recipientCount: ctx.recipientCount,
    recipientMode:  ctx.recipientMode,
  });
}

/** Stage 4 — Per-recipient processing started. */
function recipient(ctx: {
  type:           string;
  eventId:        string;
  userId:         string;
  activeChannels: string[];
}): void {
  if (!isEnabled()) return;
  logger.info("[NOTIF:RECIPIENT] Delivering to recipient", {
    stage:          "RECIPIENT",
    eventType:       ctx.type,
    eventId:        ctx.eventId,
    userId:         ctx.userId,
    activeChannels: ctx.activeChannels,
  });
}

/** Stage 5 — Channel job enqueued. */
function dispatch(ctx: {
  type:    string;
  eventId: string;
  userId:  string;
  channel: string;
}): void {
  if (!isEnabled()) return;
  logger.info(`[NOTIF:DISPATCH] ${ctx.channel} job enqueued`, {
    stage:     "DISPATCH",
    eventType:  ctx.type,
    eventId:   ctx.eventId,
    userId:    ctx.userId,
    channel:   ctx.channel,
  });
}

/** Stage 6 — Channel worker processed the job successfully. */
function channel(ctx: {
  channel:  string;
  eventId:  string;
  userId:   string;
  extra?:   Record<string, unknown>;
}): void {
  if (!isEnabled()) return;
  logger.info(`[NOTIF:CHANNEL] ${ctx.channel} worker processed`, {
    stage:   "CHANNEL",
    channel: ctx.channel,
    eventId: ctx.eventId,
    userId:  ctx.userId,
    ...ctx.extra,
  });
}

/** Any stage — processing suppressed. Always includes reason. */
function drop(ctx: {
  stage:   string;
  type:    string;
  eventId: string;
  userId?: string;
  reason:  string;
}): void {
  if (!isEnabled()) return;
  logger.info(`[NOTIF:DROP] ${ctx.stage} — ${ctx.reason}`, {
    stage:     ctx.stage,
    eventType:  ctx.type,
    eventId:   ctx.eventId,
    userId:    ctx.userId,
    reason:    ctx.reason,
  });
}

export const notifDebug = {
  isEnabled,
  emit,
  pickup,
  decider,
  recipient,
  dispatch,
  channel,
  drop,
};
