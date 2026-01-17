import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import { requireUser } from "@/shared/utils/graphql-helpers";

// Features (Mutations)
import {
  createWorkspace,
  CreateWorkspaceSchema,
  createOnboardingWorkspace,
  CreateOnboardingWorkspaceSchema,
  checkSlugAvailability,
  CheckAvailabilitySchema,
  inviteToWorkspace,
  InviteToWorkspaceSchema,
  acceptInvite,
  AcceptInviteSchema,
  updateMemberRole,
  UpdateMemberRoleSchema,
  removeMember,
  RemoveMemberSchema,
} from "../../services";

// Queries
import {
  getMyWorkspaces,
  GetMyWorkspacesSchema,
  getOnboardingStatus,
  GetOnboardingStatusSchema,
  getWorkspaceBySlug,
  GetWorkspaceBySlugSchema,
  getInviteInfo,
  GetInviteInfoSchema,
  getWorkspaceMembers,
  GetWorkspaceMembersSchema,
} from "../../queries";

export const resolvers: Resolvers = {
  Query: {
    myWorkspaces: async (_root, _args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetMyWorkspacesSchema.parse({ userId: ctx.auth.userId });
      return getMyWorkspaces(data, ctx);
    },

    onboardingStatus: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        return {
          hasUser: false,
          hasWorkspace: false,
          hasProject: false,
          workspaceSlug: null,
        };
      }

      const data = GetOnboardingStatusSchema.parse({ userId });
      return getOnboardingStatus(data, ctx);
    },

    workspaceBySlug: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceBySlugSchema.parse({
        userId: ctx.auth.userId,
        slug: args.slug,
      });
      return getWorkspaceBySlug(data, ctx);
    },

    getWorkspaceInviteInfo: async (_root, args, ctx) => {
      const user = await requireUser(ctx).catch(() => null);
      const data = GetInviteInfoSchema.parse({
        token: args.token,
        userId: user?.id,
        userEmail: user?.email,
      });
      return getInviteInfo(data, ctx);
    },

    workspaceMembers: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceMembersSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getWorkspaceMembers(data, ctx);
    },
  },

  Mutation: {
    createOnboardingWorkspace: async (_root, _args, ctx) => {
      const user = await requireUser(ctx);
      const data = CreateOnboardingWorkspaceSchema.parse({
        userId: user.id,
        userFullName: user.fullName || "User",
      });
      return createOnboardingWorkspace(data, ctx);
    },

    checkSlugAvailability: async (_root, args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");

      const data = CheckAvailabilitySchema.parse({
        slug: args.slug,
        userId,
      });
      return checkSlugAvailability(data, ctx);
    },

    createWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = CreateWorkspaceSchema.parse({
        userId: ctx.auth.userId,
        slug: args.slug,
        name: args.name,
      });
      return createWorkspace(data, ctx);
    },

    inviteToWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = InviteToWorkspaceSchema.parse({
        workspaceId: args.input.workspaceId,
        emails: args.input.emails,
        actorUserId: ctx.auth.userId,
      });
      return inviteToWorkspace(data, ctx);
    },

    acceptWorkspaceInvite: async (_root, args, ctx) => {
      const user = await requireUser(ctx);
      const data = AcceptInviteSchema.parse({
        token: args.input.token,
        userId: user.id,
        userEmail: user.email,
      });
      return acceptInvite(data, ctx);
    },

    updateWorkspaceMemberRole: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateMemberRoleSchema.parse({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        role: args.role,
        actorUserId: ctx.auth.userId,
      });
      return updateMemberRole(data, ctx);
    },

    removeWorkspaceMember: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = RemoveMemberSchema.parse({
        workspaceId: args.workspaceId,
        memberId: args.memberId,
        actorUserId: ctx.auth.userId,
      });
      return removeMember(data, ctx);
    },
  },
};
