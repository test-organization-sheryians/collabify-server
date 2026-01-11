import { Hono, Context, Next } from "hono";
import { createYoga, useLogger } from "graphql-yoga";
import { schema } from "../graphql/schema";
import { createContext } from "../graphql/context";
import { mapToGraphQLError } from "../shared/errors";
import webhookRoutes from "./routes/webhooks";
import { clerkMiddleware } from "@hono/clerk-auth";
import { pinoLogger } from "hono-pino";
import { logger } from "../shared/logger";
import { env } from "../shared/config/env";
import { checkConnection } from "../infra/db";
import { cors } from "hono/cors";
import { ServiceContext } from "../graphql/types";
import { idempotencyMiddleware } from "../shared/middleware/idempotency";
import { NotificationModule } from "../modules/notification";

interface GraphQLLogPayload {
  msg: string;
  operation?: string;
  variables?: Record<string, unknown>;
}

const app = new Hono();

// Check DB connection on startup
checkConnection();
// Start Notification Engine (Poller + Workers)
NotificationModule.startEngine().catch((err) => {
  logger.error({ err }, "Failed to start Notification Engine");
});

app.use("*", cors());

app.get("/", (c: Context) => {
  return c.text("Collabify Server is running!");
});

app.route("/", webhookRoutes);

app.use("*", clerkMiddleware());

app.use("*", idempotencyMiddleware);

const loggerMiddleware = pinoLogger({
  pino: logger,
  http: {
    reqId: () => crypto.randomUUID(),
  },
});

app.use("*", async (c: Context, next: Next) => {
  if (c.req.path === "/graphql") {
    return next();
  }
  return loggerMiddleware(c, next);
});

const yoga = createYoga<ServiceContext>({
  schema,
  graphqlEndpoint: "/graphql",
  context: ({ c }) => createContext(c),
  maskedErrors: {
    maskError: (error: unknown, _message: string) => {
      return mapToGraphQLError(error);
    },
  },
  plugins: [
    useLogger({
      logFn: (eventName, args) => {
        if (eventName === "execute-start") {
          const payload: GraphQLLogPayload = {
            msg: "GraphQL Execution Started",
            operation: args.args.operationName ?? "Unnamed Operation",
          };
          if (env.LOG_GRAPHQL_VARS) {
            payload.variables = args.args.variableValues as Record<
              string,
              unknown
            >;
          }
          logger.info(payload);
        }
        if (eventName === "execute-end") {
          const result = args.result;
          logger.info({
            msg: "GraphQL Execution Completed",
            // operation: args.args.operationName ?? "Unnamed Operation",
            // data: result.data,
            errors: result.errors,
          });
        }
      },
    }),
  ],
});

// Mount Yoga on the /graphql endpoint
app.use("/graphql", async (c: Context) => {
  return yoga.fetch(c.req.raw, {}, { c });
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
