import { UserService } from "./service";
import { GraphQLContext } from "../../graphql/context";
import { AppError } from "../../shared/errors";

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.auth.userId) return null;

      // Try to find by Clerk ID first (mapped via UserKey)
      const user = await UserService.findUserByClerkId(context.auth.userId);
      return user;
    },
  },
  Mutation: {
    createUser: async (
      _: any,
      args: {
        clerkId: string;
        email: string;
        fullName?: string;
        avatarUrl?: string;
      },
      context: GraphQLContext
    ) => {
      // Security: Ensure the caller owns this Clerk ID
      if (context.auth.userId !== args.clerkId) {
        throw AppError.unauthorized("Clerk ID mismatch");
      }

      return UserService.createUserFromClerk(args);
    },
  },
};
