import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import { requireUser } from "@/shared/utils/graphql-helpers";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import { generatePresignedGet } from "@/modules/vault/lib/s3-keys";
import { VAULT_S3 } from "@/modules/vault/lib/constants";

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
  updateWorkspace,
  UpdateWorkspaceSchema,
  leaveWorkspace,
  LeaveWorkspaceSchema,
  cancelWorkspaceInvite,
  CancelWorkspaceInviteSchema,
  resendWorkspaceInvite,
  ResendWorkspaceInviteSchema,
  deleteWorkspace,
  DeleteWorkspaceSchema,
  transferWorkspaceOwnership,
  TransferWorkspaceOwnershipSchema,
  createWorkspaceRole,
  CreateWorkspaceRoleSchema,
  updateWorkspaceRole,
  UpdateWorkspaceRoleSchema,
  deleteWorkspaceRole,
  DeleteWorkspaceRoleSchema,
  assignRolePermission,
  AssignRolePermissionSchema,
  removeRolePermission,
  RemoveRolePermissionSchema,
  renameWorkspaceSlug,
  RenameWorkspaceSlugSchema,
  requestWorkspaceLogoUpload,
  RequestWorkspaceLogoUploadSchema,
  updateWorkspaceNotifPrefs,
  UpdateWorkspaceNotifPrefsSchema,
} from "../services";

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
  getWorkspaceById,
  GetWorkspaceByIdSchema,
  getWorkspaceInvites,
  GetWorkspaceInvitesSchema,
  getWorkspaceRoles,
  GetWorkspaceRolesSchema,
  getRolePermissions,
  GetRolePermissionsSchema,
  getWorkspaceOverview,
  GetWorkspaceOverviewSchema,
  getWorkspacePermissions,
  GetWorkspacePermissionsSchema,
} from "../queries";

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

    workspaceById: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceByIdSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getWorkspaceById(data, ctx);
    },

    workspaceInvites: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceInvitesSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getWorkspaceInvites(data, ctx);
    },

    workspaceRoles: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceRolesSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getWorkspaceRoles(data, ctx);
    },

    rolePermissions: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetRolePermissionsSchema.parse({
        roleId: args.roleId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getRolePermissions(data, ctx);
    },

    workspacePermissions: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspacePermissionsSchema.parse({
        workspaceId: args.workspaceId,
      });
      return getWorkspacePermissions(data, ctx);
    },

    workspaceOverview: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceOverviewSchema.parse({ workspaceId: args.workspaceId });
      return getWorkspaceOverview(data, ctx);
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
        roleId: args.input.roleId,
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
        roleId: args.roleId,
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

    updateWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateWorkspaceSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return updateWorkspace(data, ctx);
    },

    leaveWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = LeaveWorkspaceSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return leaveWorkspace(data, ctx);
    },

    cancelWorkspaceInvite: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = CancelWorkspaceInviteSchema.parse({
        inviteId: args.inviteId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return cancelWorkspaceInvite(data, ctx);
    },

    resendWorkspaceInvite: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = ResendWorkspaceInviteSchema.parse({
        inviteId: args.inviteId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return resendWorkspaceInvite(data, ctx);
    },

    deleteWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeleteWorkspaceSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return deleteWorkspace(data, ctx);
    },

    transferWorkspaceOwnership: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = TransferWorkspaceOwnershipSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        newOwnerId: args.newOwnerId,
      });
      return transferWorkspaceOwnership(data, ctx);
    },

    createWorkspaceRole: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = CreateWorkspaceRoleSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return createWorkspaceRole(data, ctx);
    },

    updateWorkspaceRole: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateWorkspaceRoleSchema.parse({
        roleId: args.roleId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return updateWorkspaceRole(data, ctx);
    },

    deleteWorkspaceRole: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeleteWorkspaceRoleSchema.parse({
        roleId: args.roleId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return deleteWorkspaceRole(data, ctx);
    },

    assignRolePermission: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = AssignRolePermissionSchema.parse({
        roleId: args.roleId,
        workspaceId: args.workspaceId,
        permissionId: args.permissionId,
        effect: args.effect,
        conditions: args.conditions,
        actorUserId: ctx.auth.userId,
      });
      return assignRolePermission(data, ctx);
    },

    removeRolePermission: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = RemoveRolePermissionSchema.parse({
        roleId: args.roleId,
        workspaceId: args.workspaceId,
        permissionId: args.permissionId,
        actorUserId: ctx.auth.userId,
      });
      return removeRolePermission(data, ctx);
    },

    renameWorkspaceSlug: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = RenameWorkspaceSlugSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        slug: args.slug,
      });
      return renameWorkspaceSlug(data, ctx);
    },

    requestWorkspaceLogoUpload: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = RequestWorkspaceLogoUploadSchema.parse({
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
      });
      return requestWorkspaceLogoUpload(data, ctx);
    },
    // @ts-expect-error - NotificationCategory from events/types vs graphql/generated are structurally identical strings
    updateWorkspaceNotifPrefs: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateWorkspaceNotifPrefsSchema.parse({
        userId: ctx.auth.userId,
        workspaceId: args.workspaceId,
        ...args.input,
      });
      return updateWorkspaceNotifPrefs(data, ctx);
    },
    muteWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      await prefWriter.updateWorkspace(ctx.auth.userId, args.workspaceId, {
        muteUntil: args.until ? new Date(args.until) : null,
      });
      return true;
    },
    unmuteWorkspace: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      await prefWriter.updateWorkspace(ctx.auth.userId, args.workspaceId, {
        muteUntil: null,
      });
      return true;
    },
  },

  Workspace: {
    logoUrl: async (workspace, _args, _ctx) => {
      if (!workspace.logoS3Key) return null;
      return generatePresignedGet(workspace.logoS3Key, VAULT_S3.PRESIGNED_GET_TTL_SECONDS);
    },
  },
};
