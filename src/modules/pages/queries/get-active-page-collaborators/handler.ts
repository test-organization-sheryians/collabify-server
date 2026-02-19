import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { GetActivePageCollaboratorsInput } from "./index";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:queries:get-active-page-collaborators");

/**
 * getActivePageCollaborators handler — live presence from Redis ZSET.
 *
 * NOTE: DataLoaders are per-GraphQL-request; WebSocket handlers use ctx.db.user.findMany directly.
 * This handler uses ctx.dataloaders.page.userById for N+1 prevention (same pattern as whiteboard).
 *
 * Workflow:
 * 1. Auth + access check
 * 2. ZRANGEBYSCORE on PageSubscribers ZSET
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
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // if (!collab) throw AppError.forbidden("Not a collaborator on this page")

    // Step 2 — Redis ZSET presence
    // TODO: const activeIds = await ctx.redis.zrange(PageKeys.PageSubscribers(input.pageId), 0, -1)

    // Step 3 — Batch user lookup (DataLoader, not direct DB — we're in a GraphQL request)
    // TODO: const users = await Promise.all(activeIds.map(id => ctx.dataloaders.page.userById.load(id)))

    // Step 4 — Join + return
    // TODO: return activeIds.map((id, i) => ({ userId: id, user: users[i] }))

    throw new AppError(
      "getActivePageCollaborators: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
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
