/**
 * getFeatureFlags — Query Handler (admin-only)
 *
 * Returns all registered feature flags with their overrides.
 * Only workspace owners may call this.
 */
import { AppError } from "@/shared/errors";
import type { GetFeatureFlagsInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";

export const getFeatureFlags = async (
  input: GetFeatureFlagsInput,
  ctx: ServiceContext
) => {
  const { actorUserId } = input;

  // Only workspace owners (any workspace) may view all flags
  const ownerMembership = await ctx.db.workspaceMember.findFirst({
    where: { userId: actorUserId, assignedRole: { rank: { gte: 100 } } },
  });
  if (!ownerMembership) throw AppError.forbidden("Admin access required");

  return ctx.db.featureFlag.findMany({
    include: {
      overrides: {
        select: {
          id: true,
          contextType: true,
          contextId: true,
          enabled: true,
        },
      },
    },
    orderBy: { key: "asc" },
  });
};
