import { createYoga, useLogger } from "graphql-yoga";
import { schema } from "../../graphql/schema";
import { createContext } from "../../graphql/context";
import { mapToGraphQLError } from "../../shared/errors";
import { createLogger } from "../../shared/lib/logger";
import { env } from "../../shared/config/env";
import { ServiceContext } from "../../graphql/types";
import { Context } from "hono";

const logger = createLogger("app:graphql");

export const createGraphQLApp = () => {
  return createYoga<ServiceContext>({
    schema,
    graphqlEndpoint: "/graphql",
    context: ({ c }) => createContext(c as Context),
    maskedErrors: {
      maskError: (error: unknown, _message: string) => {
        return mapToGraphQLError(error);
      },
    },
    plugins: [
      useLogger({
        logFn: (eventName, args) => {
          if (eventName === "execute-start") {
            const context: Record<string, unknown> = {
              operation: args.args.operationName ?? "Unnamed Operation",
            };
            if (env.LOG_GRAPHQL_VARS) {
              context.variables = args.args.variableValues;
            }
            logger.info("GraphQL Execution Started", context);
          }
          if (eventName === "execute-end") {
            const result = args.result;
            logger.info("GraphQL Execution Completed", {
              errors: result.errors,
            });
          }
        },
      }),
    ],
  });
};
