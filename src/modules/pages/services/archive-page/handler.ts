import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ArchivePageInput } from "./schema";

const logger = createLogger("pages:services:archive-page");

/**
 * archivePage handler
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page + EDITOR check
 * 3. Collect all descendant IDs (in-memory BFS — single flat DB query)
 * 4. Batch updateMany to set isArchived=true on page + all descendants
 * 5. Pub/Sub broadcast page-archived
 */
export const handler = async (input: ArchivePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can archive a page")

    // Step 2 — Collect descendants (O(N) BFS — single query, build in memory)
    // TODO: const allPages = await ctx.db.page.findMany({ where: { projectId: page.projectId, deletedAt: null }, select: { id: true, parentId: true } })
    // Build adjacency map, BFS from input.pageId to get all descendant IDs
    // const descendantIds = bfs(allPages, input.pageId)
    // const allIds = [input.pageId, ...descendantIds]

    // Step 3 — Batch update
    // TODO: await ctx.db.page.updateMany({ where: { id: { in: allIds } }, data: { isArchived: true } })

    // Step 4 — Pub/Sub
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:archived', data: { pageId: input.pageId, archivedBy: userId } }))

    // logger.info("Page archived", { pageId: input.pageId, descendantCount: descendantIds.length, userId })
    // return { page: updatedPage }

    throw new AppError("archivePage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to archive page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to archive page");
  }
};
