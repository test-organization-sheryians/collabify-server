import { Context } from "hono";
import { logger } from "../../shared/logger";
import { Server, ServerWebSocket } from "bun";
import { ChatWebSocket, WSContext } from "./types";
import { wsRegistry } from "./subscription-registry";
import { wsRouter } from "./router";
import { db } from "../db";

/**
 * Validates the connection request (Clerk Token)
 * TODO: Move to shared/auth later
 */
function authenticate(c: Context): { userId: string } | null {
  const token = c.req.query("token") || c.req.header("Authorization");
  if (!token) return null;
  // MOCK: Accept any non-empty token for dev
  return { userId: "user_" + token.slice(0, 5) };
}

/**
 * Handles the WebSocket Upgrade and LifeCycle
 */
export const createWSGateway = () => {
  return {
    // Hono Route Handler for /ws
    upgradeHandler: (c: Context) => {
      const workspaceId = c.req.query("workspaceId");

      // 1. Validate Input
      if (!workspaceId) {
        return c.text("Missing workspaceId", 400);
      }

      // 2. Authenticate
      const auth = authenticate(c);
      if (!auth) {
        return c.text("Unauthorized", 401);
      }

      // 3. Upgrade to Native Bun WebSocket
      const server = c.env as unknown as Server<WSContext>;

      if (server && typeof server.upgrade === "function") {
        const success = server.upgrade(c.req.raw, {
          data: {
            workspaceId,
            userId: auth.userId,
            socketId: crypto.randomUUID(),
            createdAt: Date.now(),
          },
        });
        if (success) {
          return undefined;
        }
      }

      return c.text("WebSocket Upgrade Failed", 500);
    },

    // Bun.serve({ websocket: ... }) Handler
    websocketHandler: {
      open(ws: ServerWebSocket<WSContext>) {
        const { workspaceId, userId, socketId } = ws.data;
        logger.info({ msg: "WS Connected", workspaceId, userId, socketId });

        // Register Session
        wsRegistry.startSession(ws);
      },

      message(ws: ServerWebSocket<WSContext>, message: string | Buffer) {
        // Keep Registry Alive
        wsRegistry.touch(ws.data.socketId);

        // Mock Context with DB Injection
        wsRouter.handleMessage({ db } as unknown as Context, ws, message);
      },

      close(ws: ServerWebSocket<WSContext>) {
        const { socketId } = ws.data;
        logger.info({ msg: "WS Closed", socketId });

        // Cleanup
        wsRegistry.endSession(socketId);
      },

      drain(ws: ServerWebSocket<WSContext>) {
        // Optional: Handle backpressure
      },
    },
  };
};

export const getWSMetrics = () => {
  return wsRegistry.getMetrics();
};
