import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import {
  syncUser,
  SyncUserSchema,
  updateProfile,
  UpdateProfileSchema,
  deleteAccount,
  DeleteAccountSchema,
} from "../services";
import {
  getMe,
  GetMeSchema,
  getPublicUser,
  GetPublicUserSchema,
  getWorkspaceUser,
  GetWorkspaceUserSchema,
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
  },
  Mutation: {
    syncUser: async (_root, args, ctx) => {
      const data = SyncUserSchema.parse(args);
      return syncUser(data, ctx);
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
  },
};
