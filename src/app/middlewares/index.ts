import { Hono, Context, Next } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import { pinoLogger } from "hono-pino";
import { idempotencyMiddleware } from "./idempotency";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";

export const registerGlobalMiddleware = (app: Hono) => {
  // 1. CORS
  app.use("*", async (c: Context, next: Next) => {
    // WebSocket routes do not need CORS (handled by Nginx Origin check / Handshake)
    if (c.req.path === "/ws") {
      return next();
    }
    return cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        env.FRONTEND_URL,
      ],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Upgrade",
        "x-idempotency-key",
      ],
      credentials: true,
    })(c, next);
  });

  // 2. Auth (Clerk)
  app.use("*", async (c: Context, next: Next) => {
    if (c.req.path === "/ws") {
      return next();
    }
    return clerkMiddleware()(c, next);
  });

  // 3. Idempotency
  app.use("*", idempotencyMiddleware);

  // 4. Logger
  app.use("*", async (c: Context, next: Next) => {
    if (
      c.req.path === "/graphql" ||
      c.req.path === "/ws" ||
      c.req.path.startsWith("/internal")
    ) {
      return next();
    }
    return pinoLogger({
      pino: logger,
      http: {
        reqId: () => crypto.randomUUID(),
      },
    })(c, next);
  });
};
