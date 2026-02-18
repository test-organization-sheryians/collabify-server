import { wsRouter } from "./router";
import { chatWSRoutes } from "../../modules/chat/ws/router";
import { whiteboardWSRoutes } from "../../modules/whiteboard/ws/router";

/**
 * Global WebSocket Route Registration
 * This file acts as the "Linker" for all WebSocket Modules.
 * It must be imported at application startup.
 */

export const registerGlobalWSRoutes = () => {
  wsRouter.registerModule("chat", chatWSRoutes);
  wsRouter.registerModule("whiteboard", whiteboardWSRoutes);
  // Future: wsRouter.registerModule("notifications", notifRoutes);
};
