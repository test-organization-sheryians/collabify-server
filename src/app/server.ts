import { Context, Hono } from "hono";
import { registerGlobalMiddleware } from "../app/middlewares/index";
import { checkConnection, db } from "../infra/db";
import { redis } from "../infra/redis";
import { createWSGateway } from "../infra/ws/gateway";
import { registerGlobalWSRoutes } from "../infra/ws/ws-routes";
import { internalRoutes } from "../modules/internal/internal.controller";
import { NotificationModule } from "../modules/notification";
import { env } from "../shared/config/env";
import { createLogger } from "../shared/lib/logger";
import { createGraphQLApp } from "./graphql/yoga";
import webhookRoutes from "./routes/webhooks";
import { vaultProxyRoutes } from "./routes/vault-proxy";
import { ChatModule } from "../modules/chat";
import { WhiteboardModule } from "../modules/whiteboard";
import { startVaultJobs } from "../modules/vault";
import { wsRegistry } from "../infra/ws/subscription-registry";
import { registry } from "./metrics";

const logger = createLogger("app:server");
const app = new Hono();

// 1. Bootstrapping
void checkConnection(); // Check DB
// NotificationModule.startEngine().catch((err) => {
//   logger.error("Failed to start Notification Engine", { err });
// });

ChatModule.startEngine().catch((err: Error) => {
  logger.error("Failed to start Chat Engine", { err });
});

WhiteboardModule.startEngine().catch((err: Error) => {
  logger.error("Failed to start Whiteboard Engine", { err });
});

startVaultJobs(db).catch((err: Error) => {
  logger.error("Failed to start Vault Jobs", { err });
});

// Start Subscription Janitor
wsRegistry.init();

// Initialize Global Middleware
registerGlobalMiddleware(app);

// Register WebSocket Routes
registerGlobalWSRoutes();

// 3. Routes
app.get("/", (c: Context) => c.text("Collabify Server is running!"));
app.get("/health", async (c: Context) => {
  try {
    await db.$queryRaw`SELECT 1`;
    await redis.ping();
    return c.json({ status: "ok", db: "ok", redis: "ok" });
  } catch (err) {
    logger.error("Health check failed", { err });
    return c.json({ status: "error" }, 503);
  }
});
app.get("/metrics", async (c: Context) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { "Content-Type": registry.contentType });
});
app.route("/", webhookRoutes);
app.route("/internal", internalRoutes);
app.route("/", vaultProxyRoutes);

// 4. GraphQL
const yoga = createGraphQLApp();
app.use("/graphql", async (c: Context) => {
  return yoga.fetch(c.req.raw, {}, { c });
});

// 5. WebSocket
const { upgradeHandler, websocketHandler } = createWSGateway();
app.get("/ws", upgradeHandler);

export default {
  hostname: env.HOST || "0.0.0.0",
  port: env.PORT,
  fetch: app.fetch,
  websocket: websocketHandler,
};
