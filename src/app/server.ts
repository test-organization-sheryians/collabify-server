import { Hono, Context } from "hono";
import webhookRoutes from "./routes/webhooks";
import { checkConnection } from "../infra/db";
import { NotificationModule } from "../modules/notification";
import { createWSGateway } from "../infra/ws-gateway";
import { registerGlobalMiddleware } from "../app/middlewares/index";
import { internalRoutes } from "../modules/internal/internal.controller";
import { createGraphQLApp } from "./graphql/yoga";
import { env } from "../shared/config/env";
import { logger } from "../shared/logger";

const app = new Hono();

// 1. Bootstrapping
void checkConnection(); // Check DB
NotificationModule.startEngine().catch((err) => {
  logger.error({ err }, "Failed to start Notification Engine");
});

// 2. Global Middleware
registerGlobalMiddleware(app);

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
