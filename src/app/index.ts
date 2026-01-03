import { Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { schema } from "../graphql/schema";
import { createContext } from "../graphql/context";
import { mapToGraphQLError } from "../shared/errors";

import webhookRoutes from "./routes/webhooks";

import { clerkMiddleware } from "@hono/clerk-auth";
import { pinoLogger } from "hono-pino";
import { useLogger } from "graphql-yoga";
import { logger } from "../shared/logger";
import { env } from "../shared/config/env";

import { checkConnection } from "../infra/db";

const app = new Hono();

// Check DB connection on startup
checkConnection();

app.get("/", (c) => {
  return c.text("Collabify Server is running!");
});

// Webhooks (Before Clerk Middleware or publicly accessible)
app.route("/", webhookRoutes);

app.use("*", clerkMiddleware());

app.use(
  pinoLogger({
    pino: logger,
    http: {
      reqId: () => crypto.randomUUID(),
    },
  })
);

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  context: (c: any) => createContext(c),
  maskedErrors: {
    maskError: (error: any, message: string) => {
      return mapToGraphQLError(error);
    },
  },
  plugins: [
    useLogger({
      logFn: (eventName, args) => {
        if (eventName === "execute-start") {
          const payload: any = {
            msg: "GraphQL Execution Started",
            operation: args.args.operationName,
          };
          if (env.LOG_GRAPHQL_VARS) {
            payload.variables = args.args.variableValues;
          }
          logger.info(payload);
        }
      },
    }),
  ],
});

// Mount Yoga on the /graphql endpoint
app.use("/graphql", async (c) => {
  return yoga.fetch(c.req.raw, app, c);
});

// Hello World route

export default {
  port: env.PORT,
  fetch: app.fetch,
};
