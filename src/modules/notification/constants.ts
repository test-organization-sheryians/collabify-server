// =============================================================================
// Notification Module — Central Constants
// Single source of truth. No magic numbers anywhere else in this module.
// =============================================================================

// -----------------------------------------------------------------------------
// BullMQ Queue Names
// -----------------------------------------------------------------------------
export const QUEUE_NAMES = {
  DECIDER:  "notif-decider",
  FANOUT:   "notif-fanout",
  BATCH:    "notif-batch",
  EMAIL:    "notif-email",
  IN_APP:   "notif-inapp",
  PUSH:     "notif-push",
  REALTIME: "notif-realtime",
  CLEANUP:  "notif-cleanup",
  RECOVERY: "notif-recovery",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// -----------------------------------------------------------------------------
// Redis Key Prefixes
// Each key documents its full pattern as a comment.
// -----------------------------------------------------------------------------
export const REDIS_KEYS = {
  // Idempotency: `notif:idem:{scope}:{eventId}:{userId?}`
  IDEMPOTENCY_PREFIX: "notif:idem:",

  // Rate limiting: `notif:rate:{userId}:{eventType}:{entityId?}`
  RATE_LIMIT_PREFIX: "notif:rate:",

  // Presence: `notif:presence:{userId}` — set by WS Gateway on connect/disconnect
  PRESENCE_PREFIX: "notif:presence:",

  // Batch state (Redis Hash): `notif:batch:{userId}:{eventType}:{groupByValue}`
  BATCH_PREFIX: "notif:batch:",

  // Batch schedule lock (prevents duplicate delayed jobs): `notif:batch:sched:{batchKey}`
  BATCH_SCHED_PREFIX: "notif:batch:sched:",

  // Unread count per user: `notif:unread:{userId}`
  UNREAD_COUNT_PREFIX: "notif:unread:",

  // Preference cache (scope blobs):
  //   global:    `notif:pref:global:{userId}`
  //   workspace: `notif:pref:ws:{userId}:{workspaceId}`
  //   project:   `notif:pref:proj:{userId}:{projectId}`
  //   conv:      `notif:pref:conv:{userId}:{conversationId}`
  PREF_GLOBAL_PREFIX:    "notif:pref:global:",
  PREF_WORKSPACE_PREFIX: "notif:pref:ws:",
  PREF_PROJECT_PREFIX:   "notif:pref:proj:",
  PREF_CONV_PREFIX:      "notif:pref:conv:",

  // Invalidation registry (SET of all active pref keys for a user): `notif:pref:keys:{userId}`
  PREF_KEYS_PREFIX: "notif:pref:keys:",

  // Cross-instance L1 cache invalidation channel (Redis pub/sub)
  PREF_INVALIDATE_CHANNEL: "notif:pref:invalidate",
} as const;

// -----------------------------------------------------------------------------
// TTLs (seconds)
// -----------------------------------------------------------------------------
export const TTL = {
  IDEMPOTENCY:     86_400, // 24 hours — safe replay window
  PREF_GLOBAL:      3_600, // 1 hour — global pref cache
  PREF_WORKSPACE:   3_600, // 1 hour — workspace pref cache
  PREF_PROJECT:     3_600, // 1 hour — project pref cache
  PREF_CONV:        1_800, // 30 min — conv pref cache (mute toggles more often)
  PREF_KEYS_REG:    7_200, // 2 hours — invalidation registry TTL
  L1_CACHE_SECS:      300, // 5 min — in-process LRU cache TTL
  RATE_LIMIT_DEFAULT:  60, // 1 min — default rate limit window
} as const;

// -----------------------------------------------------------------------------
// Fan-out Settings
// -----------------------------------------------------------------------------
export const FANOUT = {
  CHUNK_SIZE: 50, // max recipients per fan-out job batch
} as const;

// -----------------------------------------------------------------------------
// Batch Defaults (overridden per EventDefinition.batching)
// -----------------------------------------------------------------------------
export const BATCH_DEFAULTS = {
  WINDOW_MS:  300_000, // 5 minutes
  MAX_SIZE:        10, // flush early after N events
} as const;

// -----------------------------------------------------------------------------
// Worker Concurrency
// -----------------------------------------------------------------------------
export const CONCURRENCY = {
  DECIDER:  10,
  FANOUT:    5,
  BATCH:     3,
  EMAIL:     5,
  IN_APP:   10,
  PUSH:      5,
  REALTIME: 20,
} as const;
