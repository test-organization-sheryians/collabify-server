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
import { verifyToken } from "@clerk/backend";
import { env } from "../../shared/config/env";

/**
 * Validates the connection request (Clerk Token)
 * TODO: Move to shared/auth later
 */
async function authenticate(c: Context): Promise<{ userId: string } | null> {
  const token = c.req.query("token") || c.req.header("Authorization");

  if (!token) return null;

  try {
    // Clean token if Bearer prefix exists (though usually WS query param is raw)
    const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    const payload = await verifyToken(rawToken, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    return { userId: payload.sub };
  } catch (err) {
    logger.error({ err }, "WS Auth Failed");
    return null;
  }
}

/**
 * Handles the WebSocket Upgrade and LifeCycle
 */
export const createWSGateway = () => {
  return {
    // Hono Route Handler for /ws
    upgradeHandler: async (c: Context) => {
      const workspaceId = c.req.query("workspaceId");

      // 1. Validate Input
      if (!workspaceId) {
        return c.text("Missing workspaceId", 400);
      }

      // 2. Authenticate
      const auth = await authenticate(c);
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
