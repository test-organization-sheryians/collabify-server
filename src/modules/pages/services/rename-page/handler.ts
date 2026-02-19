import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RenamePageInput } from "./schema";

const logger = createLogger("pages:services:rename-page");

/**
 * renamePage handler
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page + collaborator check
 * 3. DB update
 * 4. Pub/Sub broadcast page-renamed
 */
export const handler = async (input: RenamePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can rename a page")

    // Step 2 — DB update
    // TODO: const updated = await ctx.db.page.update({ where: { id: input.pageId }, data: { title: input.title } })

    // Step 3 — Pub/Sub broadcast
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:renamed', data: { pageId: input.pageId, title: input.title, renamedBy: userId } }))

    // logger.info("Page renamed", { pageId: input.pageId, title: input.title, userId })
    // return { page: updated }

    throw new AppError("renamePage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to rename page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to rename page");
  }
};
