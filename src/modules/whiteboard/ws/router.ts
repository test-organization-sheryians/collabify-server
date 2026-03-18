import { RouteMap } from "@/infra/ws/types";
import { subscribeBoard } from "./events/subscribe-board";
import { unsubscribeBoard } from "./events/unsubscribe-board";
import { boardUpdate } from "./events/board-update";
import { cursorMove } from "./events/cursor-move";
import { selectionChange } from "./events/selection-change";
import { pointerDown } from "./events/pointer-down";
import { pointerUp } from "./events/pointer-up";

/**
 * Whiteboard WebSocket Route Map
 * Maps event names to their handlers
 *
 * NOTE: Snapshot data is fetched via GraphQL query `getBoardSnapshot`,
 * not through WebSocket events.
 */
export const whiteboardWSRoutes: RouteMap = {
  // Session Management
  "whiteboard:subscribe-board": subscribeBoard,
  "whiteboard:unsubscribe-board": unsubscribeBoard,

  // Y.Doc Updates (Persisted)
  "whiteboard:board-update": boardUpdate,

  // Ephemeral Events (Not Persisted)
  "whiteboard:cursor-move": cursorMove,
  "whiteboard:selection-change": selectionChange,
  "whiteboard:pointer-down": pointerDown,
  "whiteboard:pointer-up": pointerUp,
};
