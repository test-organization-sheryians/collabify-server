import { UserService } from "./service";
import { GraphQLContext } from "../../graphql/context";
import { AppError } from "../../shared/errors";

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.auth.userId) return null;

      // Use DataLoader for caching and batching
      return context.dataloaders.user.userByClerkId.load(context.auth.userId);
    },
  },
  Mutation: {
    syncUser: async (_: any, args: unknown, context: GraphQLContext) => {
      // Security: Ensure the caller owns this Clerk ID
      const typedArgs = args as { clerkId: string };
      if (context.auth.userId !== typedArgs.clerkId) {
        throw AppError.unauthorized("Clerk ID mismatch");
      }

      return UserService.syncUserFromClerk(args);
    },
  },
};
