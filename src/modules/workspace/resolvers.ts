import { GraphQLContext } from "../../graphql/context";
import { AppError } from "../../shared/errors";
import { WorkspaceService } from "./service";
import { UserService } from "../user/service";

export const resolvers = {
  Query: {
    myWorkspaces: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      // Verify user exists in DB first (should use dataloader ideally if heavily used, or service)
      const user = await UserService.findUserByClerkId(ctx.auth.userId);
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.getWorkspacesForUser({ userId: user.id });
    },
    onboardingStatus: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) {
        throw AppError.unauthorized("Unauthorized");
      }

      const user = await UserService.findUserByClerkId(ctx.auth.userId);

      if (!user) {
        return {
          hasUser: false,
          hasWorkspace: false,
          hasProject: false,
          workspaceSlug: null,
        };
      }

      return WorkspaceService.getOnboardingStatus({ userId: user.id });
    },
  },
  Mutation: {
    createOnboardingWorkspace: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      const user = await UserService.findUserByClerkId(ctx.auth.userId);
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.createOnboardingWorkspace({
        userId: user.id,
        userFullName: user.fullName || "User",
      });
    },
  },
};
