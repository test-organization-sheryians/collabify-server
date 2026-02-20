import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { GetActivePageCollaboratorsInput } from "./index";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:queries:get-active-page-collaborators");

/**
 * getActivePageCollaborators handler — live presence from Redis ZSET.
 *
 * Workflow:
 * 1. Auth + access check
 * 2. ZRANGE on PageSubscribers ZSET
 * 3. Batch user lookup via DataLoader
 * 4. Return joined result
 */
export const getActivePageCollaboratorsHandler = async (
  input: GetActivePageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Access check
    const collab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!collab) throw AppError.forbidden("Not a collaborator on this page");

    // Step 2 — Redis ZSET presence
    const activeIds = await ctx.redis.zrange(
      PageKeys.PageSubscribers(input.pageId),
      0,
      -1
    );

    if (activeIds.length === 0) return [];

    // Step 3 — Batch user lookup directly from DB
    // (DataLoaders are for field resolvers only — query handlers use ctx.db directly)
    const users = await ctx.db.user.findMany({
      where: { id: { in: activeIds } },
      select: { id: true, fullName: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Step 4 — Join + return
    return activeIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        return {
          userId: id,
          role: "VIEWER" as const, // presence doesn't carry role — default to VIEWER
          joinedAt: new Date().toISOString(),
          user: {
            id: user.id,
            fullName: user.fullName ?? "",
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
        };
      })
      .filter(Boolean);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get active collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to fetch active collaborators");
  }
};
