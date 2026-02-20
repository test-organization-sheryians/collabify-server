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
 * 1. Auth + fetch page + EDITOR role check
 * 2. Active subscriber guard (reject if anyone currently editing)
 * 3. Soft delete (set deletedAt)
 * 4. Pub/Sub broadcast page-deleted
 */
export const handler = async (input: DeletePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + auth
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    const collab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!collab || collab.role !== "EDITOR") {
      throw AppError.forbidden("Only editors can delete a page");
    }

    // Step 2 — Active subscriber guard
    const activeCount = await ctx.redis.zcard(
      PageKeys.PageSubscribers(input.pageId)
    );
    if (activeCount > 0) {
      throw AppError.conflict(
        "Cannot delete a page while collaborators are actively editing"
      );
    }

    // Step 3 — Soft delete
    await ctx.db.page.update({
      where: { id: input.pageId },
      data: { deletedAt: new Date() },
    });

    // Step 4 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:deleted",
        data: { pageId: input.pageId, deletedBy: userId },
      })
    );

    logger.info("Page soft-deleted", { pageId: input.pageId, userId });
    return { success: true, pageId: input.pageId };
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
