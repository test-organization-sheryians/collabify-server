import { Context, Hono } from "hono";
import { registerGlobalMiddleware } from "../app/middlewares/index";
import { checkConnection } from "../infra/db";
import { createWSGateway } from "../infra/ws/gateway";
import { registerGlobalWSRoutes } from "../infra/ws/ws-routes";
import { internalRoutes } from "../modules/internal/internal.controller";
import { NotificationModule } from "../modules/notification";
import { env } from "../shared/config/env";
import { createLogger } from "../shared/lib/logger";
import { createGraphQLApp } from "./graphql/yoga";
import webhookRoutes from "./routes/webhooks";
import { ChatModule } from "../modules/chat";
import { WhiteboardModule } from "../modules/whiteboard";
import { wsRegistry } from "../infra/ws/subscription-registry";

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

// Start Subscription Janitor
wsRegistry.init();

// Initialize Global Middleware
registerGlobalMiddleware(app);

// Register WebSocket Routes
registerGlobalWSRoutes();

// 3. Routes
app.get("/", (c: Context) => c.text("Collabify Server is running!"));
app.route("/", webhookRoutes);
app.route("/internal", internalRoutes);

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
