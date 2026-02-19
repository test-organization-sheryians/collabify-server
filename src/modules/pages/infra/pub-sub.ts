/**
 * Pages Pub/Sub — Typed wrappers for Redis PUBLISH.
 *
 * WHY: Using redis.publish() directly with JSON.stringify means the publisher
 * and subscriber must manually keep their payload shapes in sync.
 * These wrappers enforce types at compile time, preventing drift.
 *
 * TWO CHANNELS PER PAGE:
 * - PageEvents:    Yjs content updates + presence notifications (user-joined, user-left, etc.)
 * - PageAwareness: Cursor/selection state only (y-protocols/awareness binary deltas)
 *
 * Subscribers (infra/ws/redis-subscriber.ts) use originSocketId to skip
 * echoing back to the socket that originated the event.
 */

import type { Redis } from "ioredis";
import { PageKeys } from "./page-keys";

// ─── Payload Types ────────────────────────────────────────────────────────────

/**
 * Payload published to the PageEvents channel.
 * Used for Yjs content updates AND presence events (joined, left, locked, etc.)
 */
export interface PagePubSubEvent {
  /** WS event type — mirrors the downstream contract types (e.g., 'page:page-update') */
  type: string;
  /** Event-specific data. Shape depends on type. */
  data: Record<string, unknown>;
  /**
   * The socketId of the connection that triggered this event.
   * The Redis subscriber uses this to skip sending the event back to the originating socket.
   * For server-initiated events (no socket), use '__server__'.
   */
  originSocketId: string;
}

/**
 * Payload published to the PageAwareness channel.
 * Carries a raw base64-encoded y-protocols/awareness binary update.
 */
export interface AwarenessPubSubPayload {
  /** base64-encoded y-protocols/awareness binary (encodeAwarenessUpdate output) */
  update: string;
  /** Socket that sent this awareness update — excluded from fan-out. */
  originSocketId: string;
}

// ─── Publishers ───────────────────────────────────────────────────────────────

/**
 * Publish a content or presence event to the page's events channel.
 *
 * Returns the number of clients that received the message (across all Redis nodes).
 * A return value of 0 is NOT an error — it means no other server nodes are
 * currently subscribed to this page's channel. The originating node handles
 * its own subscribers directly via the subscription registry.
 *
 * TODO: Implement
 * redis.publish(PageKeys.PageEvents(pageId), JSON.stringify(payload))
 */
export function publishPageEvent(
  redis: Redis,
  pageId: string,
  payload: PagePubSubEvent
): Promise<number> {
  // TODO: return redis.publish(PageKeys.PageEvents(pageId), JSON.stringify(payload))
  throw new Error("publishPageEvent: not implemented");
}

/**
 * Publish an awareness update to the page's awareness channel.
 *
 * TODO: Implement
 * redis.publish(PageKeys.PageAwareness(pageId), JSON.stringify(payload))
 */
export function publishAwareness(
  redis: Redis,
  pageId: string,
  payload: AwarenessPubSubPayload
): Promise<number> {
  // TODO: return redis.publish(PageKeys.PageAwareness(pageId), JSON.stringify(payload))
  throw new Error("publishAwareness: not implemented");
}
