/**
 * Pages WS Contract — Zod schemas for all incoming WebSocket events.
 *
 * WHY ZOD NOT TS TYPES:
 * TypeScript types are erased at runtime. We need runtime validation at the
 * WS boundary because clients are untrusted. Zod gives us both type inference
 * and runtime parsing in one schema definition.
 *
 * All payloads are validated against these schemas at the router level (ws/router.ts)
 * BEFORE dispatch to the individual event handlers.
 *
 * Downstream types (what we send back to clients) are defined alongside each handler.
 */

import { z } from "zod";

// ─── Incoming Event Types ─────────────────────────────────────────────────────

/** Subscribe to a page's real-time update stream */
export const subscribePageSchema = z.object({
  type: z.literal("page:subscribe"),
  payload: z.object({
    pageId: z.string().cuid(),
    /**
     * The last stream entry ID the client processed.
     * Used for gap-fill on reconnect: server sends all XRANGE entries from
     * lastStreamId..now before the client transitions to live stream consumption.
     * Use '0-0' for first-time open (no gap-fill needed — client used getPageSnapshot).
     */
    lastStreamId: z.string().default("0-0"),
  }),
});

/** Unsubscribe from a page's stream */
export const unsubscribePageSchema = z.object({
  type: z.literal("page:unsubscribe"),
  payload: z.object({
    pageId: z.string().cuid(),
  }),
});

/** Submit a Yjs XmlFragment binary delta */
export const pageUpdateSchema = z.object({
  type: z.literal("page:update"),
  payload: z.object({
    pageId: z.string().cuid(),
    /** base64-encoded Yjs XmlFragment binary delta (applyUpdate format) */
    update: z.string(),
    /** Unique ID for deduplication (UUIDv4 from client) */
    dedupeId: z.string().uuid(),
  }),
});

/** Submit a y-protocols awareness update (cursors, selections) */
export const awarenessUpdateSchema = z.object({
  type: z.literal("page:awareness-update"),
  payload: z.object({
    pageId: z.string().cuid(),
    /** base64-encoded y-protocols/awareness binary */
    update: z.string(),
  }),
});

// ─── Union Type ───────────────────────────────────────────────────────────────

/** All valid incoming WS event schemas */
export const pageEventSchemas = {
  "page:subscribe": subscribePageSchema,
  "page:unsubscribe": unsubscribePageSchema,
  "page:update": pageUpdateSchema,
  "page:awareness-update": awarenessUpdateSchema,
} as const;

export type PageEventType = keyof typeof pageEventSchemas;
