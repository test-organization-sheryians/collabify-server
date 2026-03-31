/**
 * toggleFeatureFlag — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - OWNER only (workspace:delete is the highest admin gate, reusing it)
 *     For GLOBAL overrides: must be workspace OWNER of any workspace (superadmin-like).
 * Steps:
 *   1. [auth] assert workspace OWNER for workspace/project/user context; global = any OWNER
 *   2. Upsert FeatureFlagOverride
 *   3. Invalidate Redis cache for this flag+context
 */
import { AppError } from "@/shared/errors";
import type { ToggleFeatureFlagInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { FeatureFlagInvalidator } from "../../invalidation/feature-flag-invalidator";

export const toggleFeatureFlag = async (
  input: ToggleFeatureFlagInput,
  ctx: ServiceContext
) => {
  const { flagKey, contextType, contextId, enabled, actorUserId } = input;

  if (!ctx.permissions) throw AppError.unauthorized();

  // Auth: only workspace owners may toggle flags
  // For GLOBAL / USER context we require any workspace OWNER role; caller passes their workspaceId
  if (contextType === "WORKSPACE" && contextId) {
    await ctx.permissions.assert("workspace:delete", { type: "workspace", id: contextId });
  } else if (contextType === "PROJECT" && contextId) {
    // Derive workspaceId via DB (thin lookup)
    const project = await ctx.db.project.findUniqueOrThrow({
      where: { id: contextId },
      select: { workspaceId: true },
    });
    await ctx.permissions.assert("workspace:delete", { type: "workspace", id: project.workspaceId });
  } else {
    // GLOBAL or USER overrides — require OWNER on at least one workspace
    const ownerMembership = await ctx.db.workspaceMember.findFirst({
      where: {
        userId: actorUserId,
        assignedRole: { rank: { gte: 100 } }, // OWNER rank
      },
    });
    if (!ownerMembership) throw AppError.forbidden("Only workspace owners may set global flag overrides");
  }

  // Ensure the flag exists first (create if missing — lazily register new flags)
  const flag = await ctx.db.featureFlag.upsert({
    where: { key: flagKey },
    create: { key: flagKey, defaultEnabled: false },
    update: {},
    select: { id: true },
  });

  // Upsert the override — use findFirst+update/create to avoid Prisma's
  // nullable compound-key type limitation (contextId: string | null).
  const existing = await ctx.db.featureFlagOverride.findFirst({
    where: {
      flagId: flag.id,
      contextType: contextType as any,
      contextId: contextId ?? null,
    },
  });

  if (existing) {
    await ctx.db.featureFlagOverride.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await ctx.db.featureFlagOverride.create({
      data: {
        flagId: flag.id,
        contextType: contextType as any,
        contextId: contextId ?? null,
        enabled,
      },
    });
  }

  // Invalidate cache for this specific context
  const invalidator = new FeatureFlagInvalidator(ctx.redis);
  await invalidator.invalidate(flagKey, contextType, contextId ?? "GLOBAL");

  // Push flags.invalidated WS event to affected users so their AuthorizationProvider
  // refetches immediately without waiting for staleTime expiry.
  if (contextType === "WORKSPACE" && contextId) {
    const members = await ctx.db.workspaceMember.findMany({
      where: { workspaceId: contextId },
      select: { userId: true },
    });
    invalidator.notifyUsers(members.map((m) => m.userId));
  } else if (contextType === "PROJECT" && contextId) {
    const members = await ctx.db.projectMember.findMany({
      where: { projectId: contextId },
      select: { userId: true },
    });
    invalidator.notifyUsers(members.map((m) => m.userId));
  } else if (contextType === "USER" && contextId) {
    // contextId IS the userId for USER-scoped overrides
    invalidator.notifyUsers([contextId]);
  }
  // GLOBAL: no targeted push — too broad; clients refetch on next staleTime expiry.

  return { success: true, flagKey, enabled };
};
