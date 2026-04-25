import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import {
  syncUser,
  SyncUserSchema,
  updateProfile,
  UpdateProfileSchema,
  deleteAccount,
  DeleteAccountSchema,
  updateGlobalNotifPrefs,
  UpdateGlobalNotifPrefsSchema,
  declineWorkspaceInvite,
  DeclineWorkspaceInviteSchema,
} from "../services";
import {
  getMe,
  GetMeSchema,
  getPublicUser,
  GetPublicUserSchema,
  getWorkspaceUser,
  GetWorkspaceUserSchema,
  getUserHome,
  GetUserHomeSchema,
  getNotificationSummary,
  GetNotificationSummarySchema,
} from "../queries";

export const resolvers: Resolvers = {
  Query: {
    me: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        return null;
      }
      const data = GetMeSchema.parse({ userId });
      return getMe(data, ctx);
    },

    user: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetPublicUserSchema.parse({ userId: args.userId });
      return getPublicUser(data, ctx);
    },

    workspaceUser: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetWorkspaceUserSchema.parse({
        workspaceId: args.workspaceId,
        userId: args.userId,
        actorUserId: ctx.auth.userId,
      });
      return getWorkspaceUser(data, ctx);
    },

    userHome: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) return null;
      const data = GetUserHomeSchema.parse({ userId });
      return getUserHome(data, ctx);
    },

    myNotificationSummary: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");
      const data = GetNotificationSummarySchema.parse({ userId });
      return getNotificationSummary(data);
    },
  },
  Mutation: {
    syncUser: async (_root, args, ctx) => {
      const data = SyncUserSchema.parse(args);
      return syncUser(data, ctx);
    },

    declineWorkspaceInvite: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeclineWorkspaceInviteSchema.parse({
        token: args.input.token,
      });
      return declineWorkspaceInvite(data, ctx);
    },

    updateProfile: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateProfileSchema.parse({
        userId: ctx.auth.userId,
        ...args.input,
      });
      return updateProfile(data, ctx);
    },

    deleteAccount: async (_root, _args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeleteAccountSchema.parse({ userId: ctx.auth.userId });
      return deleteAccount(data, ctx);
    },

    updateGlobalNotifPrefs: async (_root, args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateGlobalNotifPrefsSchema.parse({
        userId,
        ...args.input,
      });
      return updateGlobalNotifPrefs(data, ctx);
    },

    setGlobalNotifMode: async (_root, args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");
      await updateGlobalNotifPrefs(
        UpdateGlobalNotifPrefsSchema.parse({ userId, globalMode: args.mode }),
        ctx
      );
      return true;
    },

    pauseNotifications: async (_root, args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");
      await updateGlobalNotifPrefs(
        UpdateGlobalNotifPrefsSchema.parse({ userId, muteUntil: args.until }),
        ctx
      );
      return true;
    },

    resumeNotifications: async (_root, _args, ctx) => {
      const userId = ctx.auth.userId;
      if (!userId) throw AppError.unauthorized("Unauthorized");
      await updateGlobalNotifPrefs(
        UpdateGlobalNotifPrefsSchema.parse({ userId, muteUntil: null }),
        ctx
      );
      return true;
    },
  },
};
