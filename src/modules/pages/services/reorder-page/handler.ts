import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ReorderPageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:reorder-page");

/**
 * reorderPage handler — moves a page to a new position / new parent.
 *
 * Workflow:
 * 1. Auth + page fetch + EDITOR check
 * 2. Circular ancestry guard (no page can become its own ancestor)
 * 3. DB update (parentPageId, position)
 * 4. Pub/Sub broadcast
 * 5. Return { page: updated }
 */
export const handler = async (input: ReorderPageInput, ctx: ServiceContext) => {
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
      throw AppError.forbidden("Only editors can reorder a page");
    }

    // Step 2 — Circular ancestry guard
    if (input.newParentId) {
      let cursor: string | null = input.newParentId;
      while (cursor) {
        if (cursor === input.pageId) {
          throw AppError.conflict(
            "Cannot move a page under its own descendant"
          );
        }
        const ancestor: { parentPageId: string | null } | null =
          await ctx.db.page.findUnique({
            where: { id: cursor },
            select: { parentPageId: true },
          });
        cursor = ancestor?.parentPageId ?? null;
      }
    }

    // Step 3 — DB update
    const updated = await ctx.db.page.update({
      where: { id: input.pageId },
      data: {
        parentPageId: input.newParentId ?? null,
        position: input.newPosition,
      },
    });

    // Step 4 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:reordered",
        data: {
          pageId: input.pageId,
          newParentId: input.newParentId,
          newPosition: input.newPosition,
          movedBy: userId,
        },
      })
    );

    logger.info("Page reordered", {
      pageId: input.pageId,
      newParentId: input.newParentId,
      newPosition: input.newPosition,
      userId,
    });
    return { page: updated };
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
