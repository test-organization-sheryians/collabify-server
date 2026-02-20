import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RenamePageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:rename-page");

/**
 * renamePage handler
 *
 * Workflow:
 * 1. Auth + page fetch + EDITOR check
 * 2. DB update (title)
 * 3. Pub/Sub broadcast page-renamed
 * 4. Return { page: updated }
 */
export const handler = async (input: RenamePageInput, ctx: ServiceContext) => {
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
      throw AppError.forbidden("Only editors can rename a page");
    }

    // Step 2 — DB update
    const updated = await ctx.db.page.update({
      where: { id: input.pageId },
      data: { title: input.title },
    });

    // Step 3 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:renamed",
        data: { pageId: input.pageId, title: input.title, renamedBy: userId },
      })
    );

    logger.info("Page renamed", {
      pageId: input.pageId,
      userId,
      title: input.title,
    });
    return { page: updated };
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
