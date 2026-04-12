import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import type { Logger } from "@/shared/lib/logger";
import type { ZodSchema } from "zod";

// =============================================================================
// Notification Module — Core Contracts
// Pure types and interfaces. Zero implementations. Zero imports from other
// notification files (this is the foundation everything else imports from).
// =============================================================================

// -----------------------------------------------------------------------------
// Primitive Enums
// -----------------------------------------------------------------------------

/** Delivery channels supported by the system. */
export type Channel = "EMAIL" | "IN_APP" | "PUSH" | "REALTIME";

/** Processing priority — drives queue priority and rate-limit overrides. */
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * How recipients are resolved for this notification type.
 * - "single"  → handler.resolveRecipients() returns exactly 1 Recipient
 * - "fan-out" → returns N recipients; Decider routes through FanoutWorker
 */
export type RecipientMode = "single" | "fan-out";

export type RateLimitScope = "per_user" | "per_user_per_entity";

/**
 * Notification categories — maps to NotificationPreference.categoryKey.
 * Users control each category independently per scope.
 */
export type NotificationCategory =
  | "chat_messages"
  | "mentions"
  | "reactions"
  | "assignments"
  | "deadlines"
  | "access_changes"
  | "collaboration"
  | "system_admin";

// -----------------------------------------------------------------------------
// Config Shapes (used inside EventDefinition — pure data)
// -----------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Sliding window in milliseconds. */
  window: number;
  /** Max events allowed within the window. */
  max: number;
  /** Scope determines the Redis key structure. */
  scope: RateLimitScope;
  /**
   * Payload field used as the entity key for `per_user_per_entity` scope.
   * e.g., "conversationId" → key: `notif:rate:{userId}:{type}:{payload.conversationId}`
   */
  entityKey?: string;
}

export interface BatchConfig {
  /** Accumulation window in milliseconds before auto-flush. */
  window: number;
  /** Payload field used to group events (e.g., "conversationId", "messageId"). */
  groupBy: string;
  /** Flush immediately once this many events are accumulated. */
  maxSize: number;
}

// -----------------------------------------------------------------------------
// EventDefinition — Pure Data (no functions, no implementations)
// Serializable. Snapshot-testable. Registered in the EventRegistry at startup.
// -----------------------------------------------------------------------------

export interface EventDefinition {
  /** Unique event type string. Must match outbox `type` field exactly. */
  type: string;

  /** Processing priority — affects queue priority and bypass rules. */
  priority: Priority;

  /** Single recipient (in payload) or fan-out (resolve N recipients via handler). */
  recipientMode: RecipientMode;

  /**
   * All channels this event is ELIGIBLE for.
   * Actual channels are narrowed by: user preferences → presence → batching.
   */
  channels: Channel[];

  /** Maps to NotificationPreference.categoryKey for preference hierarchy lookup. */
  category: NotificationCategory;

  /** Zod schema to validate outbox payload at Decider entry. Invalid → DLQ. */
  payloadSchema: ZodSchema;

  /** Batching config. Undefined = no batching (deliver immediately). */
  batching?: BatchConfig;

  /** Rate limiting config. Undefined = no rate limiting. */
  rateLimit?: RateLimitConfig;

  /**
   * If true, skip user preference lookup entirely.
   * Use for system events (invites, welcome) where the user has no say.
   */
  skipPreferences?: boolean;

  /**
   * If true, this event breaks through conversation MUTED mode.
   * Use for @mentions and direct assignments — Slack-equivalent behavior.
   */
  overrideMute?: boolean;

  /**
   * If true, skip rate limit check.
   * Use for CRITICAL priority events (e.g., access revocation).
   */
  skipRateLimit?: boolean;
}

// -----------------------------------------------------------------------------
// NotificationHandler — Pure Logic (per event type)
// All business logic lives here. Nothing from EventDefinition is a function.
// -----------------------------------------------------------------------------

export interface Recipient {
  /** Database user ID. Null for external invitees (email-only delivery). */
  userId: string | null;
  /** Email address for delivery. Required when userId is null. */
  email: string | null;
}

export interface HandlerContext {
  db:     PrismaClient;
  redis:  Redis;
  logger: Logger;
}

/**
 * Per-event-type handler. Implements the strategy pattern.
 * TPayload is the validated payload type from EventDefinition.payloadSchema.
 *
 * Rules:
 * - `resolveRecipients` is ALWAYS required.
 * - `shouldDeliver` is optional but strongly recommended for staleness checks.
 * - `build*` methods return `undefined` to explicitly skip a channel.
 * - `build*` methods accept optional `batched` array for batch-aware rendering.
 */
export interface NotificationHandler<TPayload = Record<string, unknown>> {
  /**
   * Resolve who should receive this notification.
   * For "single" recipientMode: return array of 1.
   * For "fan-out": return all recipients. Chunking is handled by FanoutEngine.
   */
  resolveRecipients(
    payload:  TPayload,
    ctx:      HandlerContext
  ): Promise<Recipient[]>;

  /**
   * Staleness check — called at delivery time, NOT at enqueue time.
   * Returns false if the underlying entity no longer exists or is no longer relevant.
   * Example: invite cancelled → return false.
   */
  shouldDeliver?(
    payload:   TPayload,
    recipient: Recipient,
    ctx:       HandlerContext
  ): Promise<boolean>;

  /**
   * Build email content. Return undefined to skip email for this recipient.
   * `batched` is populated when called from BatchWorker flush.
   */
  buildEmail?(
    payload:   TPayload,
    recipient: Recipient,
    batched?:  TPayload[]
  ): Promise<EmailContent | undefined>;

  /**
   * Build in-app notification content. Return undefined to skip.
   * In-app is the reliability channel — only skip if truly irrelevant.
   */
  buildInApp?(
    payload:   TPayload,
    recipient: Recipient,
    batched?:  TPayload[]
  ): Promise<InAppContent | undefined>;

  /**
   * Build push notification content. Return undefined to skip.
   */
  buildPush?(
    payload:   TPayload,
    recipient: Recipient,
    batched?:  TPayload[]
  ): Promise<PushContent | undefined>;

  /**
   * Build real-time WebSocket push payload. Return undefined to skip.
   * Note: REALTIME channel is never batched — always delivered immediately.
   */
  buildRealtime?(
    payload:   TPayload,
    recipient: Recipient
  ): Promise<RealtimeContent | undefined>;
}

// -----------------------------------------------------------------------------
// Registry Entry — binds EventDefinition (config) to NotificationHandler (logic)
// -----------------------------------------------------------------------------

export interface RegistryEntry {
  definition: EventDefinition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler:    NotificationHandler<any>;
}

// -----------------------------------------------------------------------------
// Channel Content Types
// These are the outputs from handler.build*() methods.
// Each channel worker accepts its respective content type.
// -----------------------------------------------------------------------------

export interface EmailContent {
  /** Recipient email address (may differ from userId's email for external invitees). */
  to:       string;
  subject:  string;
  /** Template identifier — matches a file in channels/email/templates/. */
  template: string;
  /** Template data — passed as props to the React Email template. */
  data:     Record<string, unknown>;
}

export interface InAppContent {
  title:      string;
  body:       string;
  /** Deep link URL relative to the app root. */
  actionUrl:  string;
  /** Entity type for field resolvers (e.g., "TASK", "PAGE", "CHAT_MESSAGE"). */
  entityType: string;
  entityId:   string;
  /** Actor who triggered the notification (used for avatar). */
  actorId?:   string;
}

export interface PushContent {
  title: string;
  body:  string;
  /** Opaque data passed to the FCM payload — used for client-side deep linking. */
  data:  Record<string, string>;
}

export interface RealtimeContent {
  /** WS event type — received by the client's WS event handler. */
  eventType: string;
  /** Opaque payload forwarded as-is to the connected socket. */
  data:      Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Job Data Shapes — what gets enqueued into BullMQ
// -----------------------------------------------------------------------------

/** Enqueued by OutboxPoller → processed by DeciderWorker. */
export interface DeciderJobData {
  eventId:   string;   // notification_outbox.id
  type:      string;   // event type string
  payload:   Record<string, unknown>;
  createdAt: string;   // ISO string (JSON-serializable)
}

/** Enqueued by DeciderWorker → processed by EmailWorker. */
export interface EmailJobData {
  eventId:        string;
  recipientUserId: string | null;
  content:        EmailContent;
  idempotencyKey: string;
}

/** Enqueued by DeciderWorker → processed by InAppWorker. */
export interface InAppJobData {
  eventId:        string;
  type:           string;
  recipientUserId: string;
  content:        InAppContent;
  idempotencyKey: string;
}

/** Enqueued by DeciderWorker → processed by PushWorker. */
export interface PushJobData {
  eventId:        string;
  recipientUserId: string;
  content:        PushContent;
  idempotencyKey: string;
}

/** Enqueued by DeciderWorker → processed by RealtimeWorker. */
export interface RealtimeJobData {
  eventId:        string;
  recipientUserId: string;
  content:        RealtimeContent;
  idempotencyKey: string;
}

/** Enqueued by DeciderWorker → processed by FanoutWorker. */
export interface FanoutJobData {
  eventId:    string;
  type:       string;
  payload:    Record<string, unknown>;
  recipients: Recipient[];
  nextCursor?: string; // for large fan-outs spanning multiple pages
}

/** Enqueued by BatchEngine → processed by BatchWorker on delay expiry. */
export interface BatchJobData {
  batchKey:  string;
  eventType: string;
}
