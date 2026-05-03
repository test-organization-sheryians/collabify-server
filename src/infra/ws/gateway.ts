import { Context } from "hono";
import { createLogger } from "../../shared/lib/logger";

import { Server, ServerWebSocket } from "bun";
import { WSSocketData } from "./types";
import { wsRegistry } from "./subscription-registry";
import { wsRouter } from "./router";
import { db } from "../db";
import { redis } from "../redis";
import { wsConnections, wsMessagesTotal, wsErrorsTotal } from "../../app/metrics";

// Redis key prefix for notification presence (matches notification/constants.ts)
const PRESENCE_PREFIX = "notif:presence:";

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
const logger = createLogger("infra:ws:gateway");

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
    logger.error("WS Auth Failed", { err });
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
      const server = c.env as unknown as Server<WSSocketData>;

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
      open(ws: ServerWebSocket<WSSocketData>) {
        const { workspaceId, userId, socketId } = ws.data;
        logger.info("WS Connected", { workspaceId, userId, socketId });
        wsConnections.inc();

        // Register session in local registry
        wsRegistry.startSession(ws);

        // Subscribe this socket to its personal notification channel so
        // RealtimeWorker's redis.publish("user:{userId}") reaches this socket.
        wsRegistry.subscribe(socketId, `user:${userId}`).catch((err) =>
          logger.warn("WS: failed to subscribe to notification channel", { err, userId })
        );

        // Mark user as online for presence-aware routing in the Decider.
        // TTL = 90 s; refreshed every 60 s by the heartbeat below.
        redis.set(`${PRESENCE_PREFIX}${userId}`, socketId, "EX", 90).catch(() => {
          /* non-fatal */
        });
      },

      message(ws: ServerWebSocket<WSSocketData>, message: string | Buffer) {
        // Keep Registry Alive
        wsRegistry.touch(ws.data.socketId);
        wsMessagesTotal.inc({ direction: "inbound" });

        // Refresh presence TTL on activity (90 s sliding window)
        redis.expire(`${PRESENCE_PREFIX}${ws.data.userId}`, 90).catch(() => { /* non-fatal */ });

        // Mock Context with DB Injection
        wsRouter.handleMessage({ db } as unknown as Context, ws, message);
      },

      close(ws: ServerWebSocket<WSSocketData>) {
        const { socketId, userId } = ws.data;
        logger.info("WS Closed", { socketId });
        wsConnections.dec();

        // Cleanup session + unsubscribe all topics (including notification channel)
        wsRegistry.endSession(socketId);

        // Clear presence key so Decider stops routing REALTIME to this user.
        // If the user has other open tabs, the key stays until all tabs close.
        redis.get(`${PRESENCE_PREFIX}${userId}`).then((stored) => {
          // Only delete if THIS socket was the one that set the presence key
          if (stored === socketId) {
            redis.del(`${PRESENCE_PREFIX}${userId}`).catch(() => { /* non-fatal */ });
          }
        }).catch(() => { /* non-fatal */ });
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      drain(_ws: ServerWebSocket<WSSocketData>) {
        // Optional: Handle backpressure
      },

      error(ws: ServerWebSocket<WSSocketData>, err: Error) {
        logger.error("WS Error", { socketId: ws.data.socketId, err });
        wsErrorsTotal.inc();
      },
    },
  };
};

export const getWSMetrics = () => {
  return wsRegistry.getMetrics();
};
