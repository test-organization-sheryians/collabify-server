/**
 * Page Keys — Single source of truth for all Redis key patterns and S3 paths.
 *
 * RULES:
 * - Every Redis key used anywhere in the pages module MUST be defined here.
 * - No key string literals outside this file.
 * - S3 keys are defined in PageS3Keys (not Redis).
 */

// ─── Redis Keys ───────────────────────────────────────────────────────────────

export const PageKeys = {
  // ── Core Stream & Sequence ──────────────────────────────────────────────────

  /** Redis Stream: XADD target for Yjs XmlFragment binary deltas */
  PageStream: (pageId: string) => `page:${pageId}:stream`,

  /** Monotonic counter: tracks how many updates have been applied to this page */
  PageSequence: (pageId: string) => `page:${pageId}:sequence`,

  /** Binary Yjs state (latest compacted snapshot). Populated by stream worker after rebuild. */
  PageSnapshotLatest: (pageId: string) => `page:${pageId}:snapshot:latest`,

  // ── Presence & Authorization ────────────────────────────────────────────────

  /**
   * ZSET of active subscribers.
   * score = join timestamp (epoch ms)
   * member = userId
   * TTL = PageTTLs.SUBSCRIBERS — auto-expires stale sessions after 24h.
   */
  PageSubscribers: (pageId: string) => `page:${pageId}:subscribers`,

  /**
   * HASH of ephemeral per-user state (optional: last cursor pos, viewport, etc.)
   * Deleted on unsubscribe.
   */
  PageUserState: (pageId: string, userId: string) =>
    `page:${pageId}:user:${userId}:state`,

  // ── Pub/Sub Channels (ephemeral — no persistence) ───────────────────────────

  /**
   * Channel for Yjs content updates and presence events (user-joined, user-left, etc.)
   * Published by: page-update WS handler, subscribe handler, unsubscribe handler.
   * Subscribed by: infra/ws/redis-subscriber.ts → fan-out to sockets.
   */
  PageEvents: (pageId: string) => `page:${pageId}:events`,

  /**
   * Channel for Yjs Awareness protocol updates (cursor positions, selections).
   * Separate from PageEvents so subscribers can filter without inspecting payload type.
   * Published by: awareness-update WS handler.
   */
  PageAwareness: (pageId: string) => `page:${pageId}:awareness`,

  // ── Safety Mechanisms ───────────────────────────────────────────────────────

  /**
   * SETEX deduplication key. Expires after PageTTLs.DEDUPE seconds.
   * Prevents double-processing when a client retries on reconnect.
   */
  PageDedupe: (pageId: string, dedupeId: string) =>
    `page:${pageId}:dedupe:${dedupeId}`,

  /**
   * SET NX key: exclusive editor lock. Value = userId who holds the lock.
   * Expires after PageTTLs.LOCK seconds.
   */
  PageLock: (pageId: string) => `page:${pageId}:lock`,

  /**
   * SET NX key: snapshot rebuild lock. Value = CONSUMER_NAME of rebuilding worker.
   * Prevents two workers from rebuilding the same page snapshot simultaneously.
   * Expires after PageTTLs.SNAPSHOT_LOCK seconds (safety net for dead workers).
   */
  PageSnapshotLock: (pageId: string) => `page:${pageId}:snapshot:lock`,

  /**
   * Unix ms timestamp of the last successful snapshot rebuild for this page.
   * SET by stream worker after each rebuild. Read by CooldownThreshold.
   * TTL = SNAPSHOT_COOLDOWN_MS * 2 (can safely expire for idle pages).
   */
  PageSnapshotLastAt: (pageId: string) => `page:${pageId}:snapshot:last-at`,

  // ── System-Wide (Worker Discovery & Coordination) ───────────────────────────

  /**
   * ZSET of pages with at least one active subscriber.
   * score = last activity timestamp (epoch ms)
   * member = pageId
   * Stream worker reads this to know which streams to consume.
   */
  SysActivePages: () => `sys:pages:active`,

  /**
   * INCR counter. Bumped whenever the active pages set changes.
   * Stream workers poll this and re-partition when it changes.
   */
  SysPagesEpoch: () => `sys:pages:epoch`,

  /**
   * ZSET of live stream worker heartbeats.
   * score = last heartbeat timestamp (epoch ms)
   * member = CONSUMER_NAME
   * Workers with score older than WORKER_TTL_MS are considered dead.
   */
  SysPageWorkers: () => `sys:page-workers:active`,
} as const;

// ─── TTLs (seconds unless noted) ─────────────────────────────────────────────

export const PageTTLs = {
  /** 24h — subscribers ZSET auto-expiry. Stale sessions clean themselves up. */
  SUBSCRIBERS: 86_400,

  /** 60s — deduplication window. Client retry must arrive within this window. */
  DEDUPE: 60,

  /** 1h — editor lock max duration. Lock auto-releases even if client crashes. */
  LOCK: 3_600,

  /** 5min — snapshot rebuild lock. Safety net for a crashed worker mid-rebuild. */
  SNAPSHOT_LOCK: 300,

  /** 1h — Redis cache TTL for the binary snapshot. S3 is the durable store. */
  SNAPSHOT_REDIS: 3_600,

  /** 30s — worker heartbeat expiry. Workers older than this are considered dead. */
  WORKER_TTL_MS: 30_000,
} as const;

// ─── S3 Object Paths (not Redis) ─────────────────────────────────────────────

export const PageS3Keys = {
  /** Primary durable snapshot. Overwritten on each stream worker rebuild. */
  LatestSnapshot: (pageId: string) => `pages/${pageId}/latest.yjs`,

  /**
   * Point-in-time historical snapshot. Written BEFORE overwriting LatestSnapshot.
   * Enables disaster recovery to any past state.
   */
  HistoricalSnapshot: (pageId: string, timestamp: number) =>
    `pages/${pageId}/snapshots/${timestamp}.yjs`,
};
