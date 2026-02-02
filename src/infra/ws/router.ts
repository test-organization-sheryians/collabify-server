import { Context } from "hono";
import { logger } from "../../shared/logger";
import {
  ChatWebSocket,
  createErrorFrame,
  InboundEnvelope,
  RouteMap,
  WSHandlerContext,
} from "./types";
import { env } from "../../shared/config/env";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";

import { ping } from "./events/ping";

/**
 * The Central WebSocket Router
 *
 * SCOPE: Per-Node
 * RESPONSIBILITY:
 * 1. Parse Raw Message
 * 2. Lookup Handler
 * 3. Validate Zod Schema
 * 4. Execute Handler
 * 5. Catch Errors
 */
export class WSRouter {
  private routes: RouteMap = {
    ping,
  };

  /**
   * Register a module's routes
   */
  public registerModule(moduleName: string, routes: RouteMap) {
    for (const [key, def] of Object.entries(routes)) {
      if (this.routes[key]) {
        logger.warn({ msg: "Duplicate WS Route detected", key, moduleName });
      }
      this.routes[key] = def;
    }
    logger.info({
      msg: "Registered WS Module",
      moduleName,
      count: Object.keys(routes).length,
    });
  }

  /**
   * Handle incoming raw message
   */
  public async handleMessage(
    ctx: Context, // Hono Context for Dependency Injection
    socket: ChatWebSocket,
    rawData: string | Buffer
  ) {
    let envelope: InboundEnvelope;

    // 1. Parse
    try {
      const str = typeof rawData === "string" ? rawData : rawData.toString();
      envelope = JSON.parse(str);
    } catch (err) {
      // Invalid JSON -> Close Socket or Send Error?
      // Send Error Frame 400
      socket.send(createErrorFrame(undefined, "error", "400", "Invalid JSON"));
      return;
    }

    const { id, type, payload } = envelope;

    if (!type) {
      socket.send(createErrorFrame(id, "error", "400", "Missing 'type' field"));
      return;
    }

    // 2. Lookup
    const route = this.routes[type];
    if (!route) {
      logger.warn({
        msg: "Unknown WS Event",
        type,
        userId: socket.data.userId,
      });
      socket.send(
        createErrorFrame(id, type, "404", `Unknown event type: ${type}`)
      );
      return;
    }

    // 3. Validate
    const validation = route.schema.safeParse(payload);
    if (!validation.success) {
      const issues = validation.error.format();

      logger.warn({
        msg: "WS Validation Failed",
        type,
        errors: issues,
      });

      // Show details only in Dev
      const details = env.NODE_ENV === "development" ? issues : undefined;

      socket.send(
        createErrorFrame(id, type, "422", "Payload validation failed", details)
      );
      return;
    }

    // 4. Build WSHandlerContext (matches GraphQL pattern)
    const handlerContext: WSHandlerContext = {
      db,
      redis,
      auth: {
        userId: socket.data.userId,
        workspaceId: socket.data.workspaceId,
      },
    };

    // 5. Execute
    try {
      await route.handler(handlerContext, socket, validation.data);
    } catch (err: any) {
      logger.error({ msg: "WS Handler Error", type, err });

      // Standardize AppError
      const code = err.statusCode || "500";
      const message = err.message || "Internal Server Error";

      socket.send(createErrorFrame(id, type, code.toString(), message));
    }
  }
}

// Singleton Router instance
export const wsRouter = new WSRouter();
