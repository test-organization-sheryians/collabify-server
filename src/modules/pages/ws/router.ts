import { RouteMap } from "@/infra/ws/types";
import { subscribePage } from "./events/subscribe-page";
import { unsubscribePage } from "./events/unsubscribe-page";
import { pageUpdate } from "./events/page-update";
import { awarenessUpdate } from "./events/awareness-update";

/**
 * Pages WebSocket Route Map
 * Maps event names to their { schema, handler } RouteDefinition objects.
 *
 * The global WS router at @/infra/ws/router.ts handles:
 *   - JSON parsing of the incoming envelope
 *   - Schema validation via the RouteDefinition.schema
 *   - Dispatch to handler
 *   - Error envelopes on parse/validation failures
 *
 * This module ONLY provides the mapping — no dispatch logic here.
 *
 * NOTE: Snapshot data is fetched via GraphQL query `getPageSnapshot`,
 * not through WebSocket events. WS is strictly for real-time deltas.
 */
export const pageWSRoutes: RouteMap = {
  // Session Management
  "page:subscribe": subscribePage,
  "page:unsubscribe": unsubscribePage,

  // Y.Doc Deltas (Persisted via Redis Stream)
  "page:update": pageUpdate,

  // Ephemeral (Not Persisted)
  "page:awareness-update": awarenessUpdate,
};
