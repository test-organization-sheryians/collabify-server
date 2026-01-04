import { GraphQLContext } from "../../graphql/context";
import { AppError } from "../../shared/errors";
import { WorkspaceService } from "./service";

export const resolvers = {
  Query: {
    myWorkspaces: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      // Verify user exists in DB first (should use dataloader ideally if heavily used, or service)
      const user = await ctx.dataloaders.user.userByClerkId.load(
        ctx.auth.userId
      );
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.getWorkspacesForUser({ userId: user.id });
    },
    onboardingStatus: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) {
        throw AppError.unauthorized("Unauthorized");
      }

      const user = await ctx.dataloaders.user.userByClerkId.load(
        ctx.auth.userId
      );

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
    workspaceBySlug: async (
      _: any,
      args: { slug: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      const user = await ctx.dataloaders.user.userByClerkId.load(
        ctx.auth.userId
      );
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.getWorkspaceBySlug({
        userId: user.id,
        slug: args.slug,
      });
    },
  },
  Mutation: {
    createOnboardingWorkspace: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.auth?.userId) throw AppError.unauthorized("Unauthorized");

      const user = await ctx.dataloaders.user.userByClerkId.load(
        ctx.auth.userId
      );
      if (!user) throw AppError.unauthorized("User not found");

      return WorkspaceService.createOnboardingWorkspace({
        userId: user.id,
        userFullName: user.fullName || "User",
      });
    },
  },
};
