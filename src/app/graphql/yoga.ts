import { createYoga, useLogger } from "graphql-yoga";
import { schema } from "../../graphql/schema";
import { createContext } from "../../graphql/context";
import { mapToGraphQLError } from "../../shared/errors";
import { logger } from "../../shared/logger";
import { env } from "../../shared/config/env";
import { ServiceContext } from "../../graphql/types";
import { Context } from "hono";

interface GraphQLLogPayload {
  msg: string;
  operation?: string;
  variables?: Record<string, unknown>;
}

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
              errors: result.errors,
            });
          }
        },
      }),
    ],
  });
};
