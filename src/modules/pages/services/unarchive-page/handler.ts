import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { UnarchivePageInput } from "./schema";

const logger = createLogger("pages:services:unarchive-page");

/**
 * unarchivePage handler
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page + EDITOR check
 * 3. Parent archived guard (409 if parent is still archived)
 * 4. Unarchive ONLY this page (not descendants — user unarchives each explicitly)
 * 5. Pub/Sub broadcast
 */
export const handler = async (
  input: UnarchivePageInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null }, include: { parent: { select: { isArchived: true } } } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can unarchive a page")

    // Step 2 — Parent guard
    // TODO: if (page.parent?.isArchived) throw AppError.badRequest("Cannot unarchive a page whose parent is still archived")

    // Step 3 — Unarchive
    // TODO: const updated = await ctx.db.page.update({ where: { id: input.pageId }, data: { isArchived: false } })

    // Step 4 — Pub/Sub
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:unarchived', data: { pageId: input.pageId, unarchivedBy: userId } }))

    // logger.info("Page unarchived", { pageId: input.pageId, userId })
    // return { page: updated }

    throw new AppError("unarchivePage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to unarchive page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to unarchive page");
  }
};
