import { Context } from "hono";
import { logger } from "../shared/logger";
import { Server, ServerWebSocket } from "bun";

// Types
export interface WSContext {
  workspaceId: string;
  userId: string;
  socketId: string;
  createdAt: number;
}

export type ChatWebSocket = ServerWebSocket<WSContext>;

// Subscription Registry (In-Memory)
// Map<ChannelID, Set<Socket>>
const subscriptionRegistry = new Map<string, Set<ChatWebSocket>>();

// Global Socket Registry (For Cleanup/Lookup)
// Map<SocketID, Socket>
const globalSocketRegistry = new Map<string, ChatWebSocket>();

/**
 * Validates the connection request (Clerk Token)
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
      // When using Bun.serve, the second argument to fetch is the Server instance.
      // Hono passes this as 'c.env'.
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
          // Bun handles the response now, we return undefined/nothing to Hono logic
          return undefined;
        }
      }

      return c.text("WebSocket Upgrade Failed", 500);
    },

    // Bun.serve({ websocket: ... }) Handler
    websocketHandler: {
      open(ws: ChatWebSocket) {
        const { workspaceId, userId, socketId } = ws.data;
        logger.info({ msg: "WS Connected", workspaceId, userId, socketId });
        globalSocketRegistry.set(socketId, ws);
      },
      message(ws: ChatWebSocket, message: string | Buffer) {
        try {
          const data = JSON.parse(
            typeof message === "string" ? message : message.toString()
          );
          handleClientMessage(ws, data);
        } catch (err) {
          logger.error({ err, msg: "WS Message Parse Error" });
        }
      },
      close(ws: ChatWebSocket) {
        const { socketId } = ws.data;
        logger.info({ msg: "WS Closed", socketId });

        globalSocketRegistry.delete(socketId);
        // Cleanup subscriptions
        for (const [channelId, subs] of subscriptionRegistry) {
          subs.delete(ws);
          if (subs.size === 0) subscriptionRegistry.delete(channelId);
        }
      },
    },
  };
};

// -- Events --

type SubscribeEvent = {
  event: "subscribe-channel";
  payload: { channelId: string };
};

type PingEvent = {
  event: "ping";
  payload?: never;
};

type ClientMessage = SubscribeEvent | PingEvent;

function isClientMessage(data: unknown): data is ClientMessage {
  if (typeof data !== "object" || data === null) return false;
  const event = (data as ClientMessage).event;
  return event === "subscribe-channel" || event === "ping";
}

function handleClientMessage(ws: ChatWebSocket, data: unknown) {
  if (!isClientMessage(data)) {
    logger.warn({ msg: "Invalid WS Message Format", data });
    return;
  }

  switch (data.event) {
    case "subscribe-channel": {
      const { channelId } = data.payload;
      if (channelId) {
        let subs = subscriptionRegistry.get(channelId);
        if (!subs) {
          subs = new Set();
          subscriptionRegistry.set(channelId, subs);
        }
        subs.add(ws);
        ws.send(
          JSON.stringify({ event: "subscribed", payload: { channelId } })
        );
      }
      break;
    }
    case "ping":
      ws.send(JSON.stringify({ event: "pong" }));
      break;
  }
}

export const getWSMetrics = () => {
  return {
    activeConnections: globalSocketRegistry.size,
    activeChannels: subscriptionRegistry.size,
  };
};
