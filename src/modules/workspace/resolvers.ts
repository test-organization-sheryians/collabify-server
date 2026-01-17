import { ServiceContext } from "@/graphql/types";
import { RoleType } from "@prisma/client";

import { WorkspaceService } from "./service";
import { requireUser } from "@/shared/utils/graphql-helpers";
import { AppError } from "@/shared/errors";

export const resolvers = {
  Query: {
    myWorkspaces: async (
      _root: unknown,
      _args: unknown,
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      return WorkspaceService.getWorkspacesForUser({ userId: ctx.auth.userId });
    },
    onboardingStatus: async (
      _root: unknown,
      _args: unknown,
      ctx: ServiceContext
    ) => {
      // Allow missing user for onboarding status check logic check below
      const userId = ctx.auth.userId;

      if (!userId) {
        return {
          hasUser: false,
          hasWorkspace: false,
          hasProject: false,
          workspaceSlug: null,
        };
      }

      return WorkspaceService.getOnboardingStatus({ userId });
    },
    workspaceBySlug: async (
      _root: unknown,
      args: { slug: string },
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.getWorkspaceBySlug({
        userId: ctx.auth.userId,
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
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.getWorkspaceMembers(ctx, {
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
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
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.checkSlugAvailability({
        slug: args.slug,
        userId: ctx.auth.userId,
      });
    },
    createWorkspace: async (
      _root: unknown,
      args: { slug: string; name: string },
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.createWorkspace({
        userId: ctx.auth.userId,
        slug: args.slug,
        name: args.name,
      });
    },

    inviteToWorkspace: async (
      _root: unknown,
      args: { input: { workspaceId: string; emails: string[] } },
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.inviteToWorkspace({
        workspaceId: args.input.workspaceId,
        emails: args.input.emails,
        actorUserId: ctx.auth.userId,
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
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.updateMemberRole({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        role: args.role,
        actorUserId: ctx.auth.userId,
      });
    },

    removeWorkspaceMember: async (
      _root: unknown,
      args: { workspaceId: string; memberId: string },
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return WorkspaceService.removeMember({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        actorUserId: ctx.auth.userId,
      });
    },
  },
};
