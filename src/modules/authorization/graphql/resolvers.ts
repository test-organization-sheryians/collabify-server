import type { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import {
  getActiveContext,
  GetActiveContextSchema,
} from "../queries/get-active-context";
import {
  getFeatureFlags,
  GetFeatureFlagsSchema,
} from "../queries/get-feature-flags";
import {
  toggleFeatureFlag,
  ToggleFeatureFlagSchema,
} from "../services/toggle-feature-flag";

export const resolvers: Resolvers = {
  Query: {
    activeContext: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetActiveContextSchema.parse({
        workspaceId: args.workspaceId,
        projectId: args.projectId ?? undefined,
        actorUserId: ctx.auth.userId,
      });
      return getActiveContext(data, ctx);
    },

    featureFlags: async (_root, _args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetFeatureFlagsSchema.parse({ actorUserId: ctx.auth.userId });
      return getFeatureFlags(data, ctx) as any;
    },
  },

  Mutation: {
    toggleFeatureFlag: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = ToggleFeatureFlagSchema.parse({
        ...args.input,
        actorUserId: ctx.auth.userId,
      });
      return toggleFeatureFlag(data, ctx);
    },
  },
};
