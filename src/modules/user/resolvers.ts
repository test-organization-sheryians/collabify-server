import { UserService } from "./service";
import { ServiceContext } from "../../graphql/types";
import { AppError } from "../../shared/errors";
import { SyncUserSchema } from "./types";

export const userResolvers = {
  Query: {
    me: async (_root: unknown, _args: unknown, context: ServiceContext) => {
      if (!context.auth.userId) return null;

      // Use DataLoader for caching and batching
      return context.dataloaders.user.userByClerkId.load(context.auth.userId);
    },
  },
  Mutation: {
    syncUser: async (
      _root: unknown,
      args: unknown,
      context: ServiceContext
    ) => {
      // Security: Validate input using Zod Schema (Validation Gateway)
      const input = SyncUserSchema.parse(args);

      // Security: Ensure the caller owns this Clerk ID
      if (context.auth.userId !== input.clerkId) {
        throw AppError.unauthorized("Clerk ID mismatch");
      }

      // Redundant but safe: logic layer will re-validate, ensuring integrity
      return UserService.syncUserFromClerk(input);
    },
  },
};
