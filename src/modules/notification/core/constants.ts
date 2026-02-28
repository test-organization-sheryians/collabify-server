export const QUEUE_NAMES = {
  DECIDER: "queue-decider",
  FANOUT: "queue-fanout",
  EMAIL: "queue-email",
  PUSH: "queue-push",
  IN_APP: "queue-inapp",
  REALTIME: "queue-realtime",
  BATCH: "queue-batch",
} as const;

export const REDIS_KEYS = {
  // Idempotency: seen:event:{eventId}:channel:{channel}
  IDEMPOTENCY_PREFIX: "seen:event:",
  // Rate Limiting: ratelimit:user:{userId}
  RATE_LIMIT_PREFIX: "ratelimit:user:",
  // Presence: presence:user:{userId} (for realtime routing)
  PRESENCE_PREFIX: "presence:user:",
} as const;
