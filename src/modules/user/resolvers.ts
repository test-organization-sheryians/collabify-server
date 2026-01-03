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
      // Validate schema first (Service handles it, but good to type check args roughly effectively passing through)
      // Actually, we pass raw args to service as per rules.

      const safeArgs = args as { clerkId: string }; // minimal check for authorization logic if needed, but here we likely rely on checking against context.

      // We need to validte that the user calling this IS the user in the arguments.
      // However, args is unknown. We'll let Zod parse it in the service,
      // BUT we need to check permissions.
      // For syncUser, typically the frontend passes the Clerk ID.

      // Let's assume args gives us what we need to verify auth ownership.
      // Since 'args' is typed as 'any' or 'unknown' coming in, we cast for the check.
      const typedArgs = args as { clerkId: string };

      // Security: Ensure the caller owns this Clerk ID
      if (context.auth.userId !== typedArgs.clerkId) {
        throw AppError.unauthorized("Clerk ID mismatch");
      }

      return UserService.syncUserFromClerk(args);
    },
  },
};
