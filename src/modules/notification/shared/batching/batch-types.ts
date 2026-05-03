// =============================================================================
// Batch Types
// Shared types for the batch accumulation system.
// =============================================================================

/** Configuration for a batchable event, defined on EventDefinition.batching. */
export interface BatchConfig {
  /** Accumulation window in milliseconds. Flush fires after this delay. */
  window:  number;
  /** Payload field used to group events into the same batch bucket. */
  groupBy: string;
  /** Flush immediately once this many events are accumulated. */
  maxSize: number;
}

/** A single entry stored in a batch bucket. */
export interface BatchEntry {
  eventId:        string;
  recipientUserId: string;
  payload:        Record<string, unknown>;
  enqueuedAt:     number; // epoch ms
}

/**
 * The Redis Hash key that identifies a unique batch bucket.
 * Structure: `notif:batch:{userId}:{eventType}:{groupByValue}`
 * Example:   `notif:batch:user_123:chat.message.new:conv_abc`
 */
export type BatchKey = string;
