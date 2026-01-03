import { GraphQLContext } from "../../graphql/context";
import { AppError } from "../../shared/errors";
import { WorkspaceService } from "./service";
import { UserService } from "../user/service";

export const resolvers = {
  Query: {
    myWorkspaces: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      const user = await UserService.findUserByClerkId(ctx.auth.userId);
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.getWorkspacesForUser(user.id);
    },
    onboardingStatus: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) {
        // No Clerk Session
        throw AppError.unauthorized("Unauthorized");
      }

      const user = await UserService.findUserByClerkId(ctx.auth.userId);

      // If valid Clerk session but no DB user yet
      if (!user) {
        return {
          hasUser: false,
          hasWorkspace: false,
          hasProject: false,
          workspaceSlug: null,
        };
      }

      return WorkspaceService.getOnboardingStatus(user.id);
    },
  },
  Mutation: {
    createOnboardingWorkspace: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      const user = await UserService.findUserByClerkId(ctx.auth.userId);
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.createOnboardingWorkspace(
        user.id,
        user.fullName || "User"
      );
    },
  },
};
