import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { DeletePageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:delete-page");

/**
 * deletePage handler (soft delete)
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page + collaborator check
 * 3. Active subscriber guard (reject if anyone currently editing)
 * 4. Soft delete (set deletedAt)
 * 5. Pub/Sub broadcast page-deleted
 */
export const handler = async (input: DeletePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can delete a page")

    // Step 2 — Active subscriber guard
    // TODO: const activeCount = await ctx.redis.zcard(PageKeys.PageSubscribers(input.pageId))
    // TODO: if (activeCount > 0) throw AppError.forbidden("Cannot delete a page while collaborators are editing")

    // Step 3 — Soft delete (cascade to children via recursive query)
    // TODO: await ctx.db.page.updateMany({ where: { id: input.pageId }, data: { deletedAt: new Date() } })
    // NOTE: Cascade soft-delete of children should be handled by a separate archival/cleanup job,
    // not done inline here (may timeout for large subtrees).

    // Step 4 — Pub/Sub broadcast
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:deleted', data: { pageId: input.pageId, deletedBy: userId } }))

    // logger.info("Page deleted", { pageId: input.pageId, userId })
    // return { success: true }

    throw new AppError("deletePage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to delete page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to delete page");
  }
};
