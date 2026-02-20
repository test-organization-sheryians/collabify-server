import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { UnarchivePageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:unarchive-page");

/**
 * unarchivePage handler — restores a single page.
 *
 * Workflow:
 * 1. Auth + page fetch + EDITOR check
 * 2. Parent-archived guard (fails if parent is still archived)
 * 3. DB update (isArchived = false)
 * 4. Pub/Sub broadcast
 * 5. Return { page: updated }
 */
export const handler = async (
  input: UnarchivePageInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + access check
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    const collab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!collab || collab.role !== "EDITOR") {
      throw AppError.forbidden("Only editors can unarchive a page");
    }

    // Step 2 — Parent-archived guard
    if (page.parentPageId) {
      const parent = await ctx.db.page.findUnique({
        where: { id: page.parentPageId },
        select: { isArchived: true },
      });
      if (parent?.isArchived) {
        throw AppError.conflict(
          "Cannot unarchive a page whose parent is still archived. Unarchive the parent first."
        );
      }
    }

    // Step 3 — DB update
    const updated = await ctx.db.page.update({
      where: { id: input.pageId },
      data: { isArchived: false },
    });

    // Step 4 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:unarchived",
        data: { pageId: input.pageId, restoredBy: userId },
      })
    );

    logger.info("Page unarchived", { pageId: input.pageId, userId });
    return { page: updated };
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
