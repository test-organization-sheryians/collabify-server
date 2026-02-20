/**
 * Pages Pub/Sub — Typed wrappers for Redis PUBLISH.
 *
 * WHY: Using redis.publish() directly with JSON.stringify means the publisher
 * and subscriber must manually keep their payload shapes in sync.
 * These wrappers enforce types at compile time, preventing drift.
 *
 * TWO CHANNELS PER PAGE:
 * - PageEvents:    Yjs content updates + presence notifications
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
 * Carries Yjs content updates AND presence events (user-joined, user-left, etc.)
 */
export interface PagePubSubEvent {
  /** WS event type — mirrors the downstream contract (e.g. 'page:page-update') */
  type: string;
  /** Event-specific data. Shape depends on type. */
  data: Record<string, unknown>;
  /**
   * The socketId that triggered this event.
   * The Redis subscriber uses this to skip the originating socket.
   * For server-initiated events (no socket), use '__server__'.
   */
  originSocketId: string;
}

/**
 * Payload published to the PageAwareness channel.
 * Carries a raw base64-encoded y-protocols/awareness binary update.
 */
export interface AwarenessPubSubPayload {
  /** base64-encoded y-protocols/awareness binary */
  update: string;
  /** Socket that sent this update — excluded from fan-out. */
  originSocketId: string;
}

// ─── Publishers ───────────────────────────────────────────────────────────────

/**
 * Publish a content or presence event to the page's events channel.
 *
 * Returns the number of subscribers that received the message.
 * A return value of 0 is NOT an error — it means no other nodes are
 * currently subscribed. The originating node handles its own subscribers
 * directly via the wsRegistry.
 */
export function publishPageEvent(
  redis: Redis,
  pageId: string,
  payload: PagePubSubEvent
): Promise<number> {
  return redis.publish(PageKeys.PageEvents(pageId), JSON.stringify(payload));
}

/**
 * Publish an awareness update to the page's awareness channel.
 */
export function publishAwareness(
  redis: Redis,
  pageId: string,
  payload: AwarenessPubSubPayload
): Promise<number> {
  return redis.publish(PageKeys.PageAwareness(pageId), JSON.stringify(payload));
}
