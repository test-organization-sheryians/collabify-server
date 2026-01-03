import { GraphQLError } from "graphql";
import { AppError } from "./app-error";

export function mapToGraphQLError(originalError: any): GraphQLError {
  if (originalError instanceof AppError) {
    return new GraphQLError(originalError.message, {
      extensions: {
        code: originalError.code,
        httpStatus: originalError.httpStatus,
        isOperational: originalError.isOperational,
        metadata: originalError.metadata,
      },
    });
  }

  // Fallback for unexpected errors
  return new GraphQLError("Internal Server Error", {
    extensions: {
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
      isOperational: false,
    },
  });
}
