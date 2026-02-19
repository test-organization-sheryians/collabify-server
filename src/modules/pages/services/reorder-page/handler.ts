import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ReorderPageInput } from "./schema";

const logger = createLogger("pages:services:reorder-page");

/**
 * reorderPage handler
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page + EDITOR check
 * 3. Circular nesting guard (ensure newParentId is not a descendant of the page being moved)
 * 4. Position collision normalisation (if newPosition collides, adjust siblings)
 * 5. DB update (parentId + position)
 * 6. Pub/Sub broadcast
 */
export const handler = async (input: ReorderPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can reorder a page")

    // Step 2 — Circular nesting guard
    // TODO: if (input.newParentId) {
    //   const allPages = await ctx.db.page.findMany({ where: { projectId: page.projectId, deletedAt: null }, select: { id: true, parentId: true } })
    //   const descendants = collectDescendants(allPages, input.pageId)
    //   if (descendants.includes(input.newParentId)) throw AppError.badRequest("Cannot move a page into one of its own descendants")
    // }

    // Step 3 — Position collision normalisation
    // Use fractional indexing: if newPosition collides with an existing sibling,
    // pick (prevSiblingPosition + newPosition) / 2. If gap < ε, trigger full rebalance.

    // Step 4 — DB update
    // TODO: const updated = await ctx.db.page.update({ where: { id: input.pageId }, data: { parentId: input.newParentId ?? null, position: input.newPosition } })

    // Step 5 — Pub/Sub
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:reordered', data: { pageId: input.pageId, newParentId: input.newParentId, newPosition: input.newPosition } }))

    // logger.info("Page reordered", { pageId: input.pageId, newParentId: input.newParentId, userId })
    // return { page: updated }

    throw new AppError("reorderPage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to reorder page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to reorder page");
  }
};
