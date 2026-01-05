import { ServiceContext } from "@/graphql/types";

import { WorkspaceService } from "./service";
import { requireUser } from "@/shared/utils/graphql-helpers";

export const resolvers = {
  Query: {
    myWorkspaces: async (
      _root: unknown,
      _args: unknown,
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);
      return WorkspaceService.getWorkspacesForUser({ userId: user.id });
    },
    onboardingStatus: async (
      _root: unknown,
      _args: unknown,
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx).catch(() => null); // Allow missing user for onboarding status check logic check below

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
      _root: unknown,
      args: { slug: string },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.getWorkspaceBySlug({
        userId: user.id,
        slug: args.slug,
      });
    },
  },
  Mutation: {
    createOnboardingWorkspace: async (
      _root: unknown,
      _args: unknown,
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.createOnboardingWorkspace({
        userId: user.id,
        userFullName: user.fullName || "User",
      });
    },
    checkSlugAvailability: async (
      _root: unknown,
      args: { slug: string },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.checkSlugAvailability({
        slug: args.slug,
        userId: user.id,
      });
    },
    createWorkspace: async (
      _root: unknown,
      args: { slug: string; name: string },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.createWorkspace({
        userId: user.id,
        slug: args.slug,
        name: args.name,
      });
    },
  },
};
