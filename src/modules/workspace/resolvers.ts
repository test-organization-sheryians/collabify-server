import { ServiceContext } from "@/graphql/types";
import { RoleType } from "@prisma/client";

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

    getWorkspaceInviteInfo: async (
      _root: unknown,
      args: { token: string },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx).catch(() => null); // Optional user

      return WorkspaceService.getInviteInfo({
        token: args.token,
        userId: user?.id,
        userEmail: user?.email,
      });
    },

    workspaceMembers: async (
      _root: unknown,
      args: { workspaceId: string },
      ctx: ServiceContext
    ) => {
      // User is required (but workspaceId comes from args now)
      const user = await requireUser(ctx);

      return WorkspaceService.getWorkspaceMembers(ctx, {
        workspaceId: args.workspaceId,
        actorUserId: user.id,
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

    inviteToWorkspace: async (
      _root: unknown,
      args: { input: { workspaceId: string; emails: string[] } },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.inviteToWorkspace({
        workspaceId: args.input.workspaceId,
        emails: args.input.emails,
        actorUserId: user.id,
      });
    },

    acceptWorkspaceInvite: async (
      _root: unknown,
      args: { input: { token: string; userId?: string; userEmail?: string } },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.acceptInvite({
        token: args.input.token,
        userId: user.id,
        userEmail: user.email,
      });
    },

    updateWorkspaceMemberRole: async (
      _root: unknown,
      args: { workspaceId: string; memberId: string; role: RoleType },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.updateMemberRole({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        role: args.role,
        actorUserId: user.id,
      });
    },

    removeWorkspaceMember: async (
      _root: unknown,
      args: { workspaceId: string; memberId: string },
      ctx: ServiceContext
    ) => {
      const user = await requireUser(ctx);

      return WorkspaceService.removeMember({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        actorUserId: user.id,
      });
    },
  },
};
