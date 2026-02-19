import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RemovePageCollaboratorInput } from "./schema";

const logger = createLogger("pages:services:remove-page-collaborator");

/**
 * removePageCollaborator handler
 *
 * Workflow:
 * 1. Auth
 * 2. Page + EDITOR check
 * 3. Cannot remove creator guard
 * 4. DB delete
 */
export const handler = async (
  input: RemovePageCollaboratorInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null }, select: { id: true, createdBy: true } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can remove collaborators")

    // Step 2 — Creator guard
    // TODO: if (input.userId === page.createdBy) throw AppError.badRequest("Cannot remove the page creator from collaborators")

    // Step 3 — Delete
    // TODO: await ctx.db.pageCollaborator.delete({ where: { pageId_userId: { pageId: input.pageId, userId: input.userId } } })

    // logger.info("Collaborator removed", { pageId: input.pageId, removedUserId: input.userId, userId })
    // return { success: true }

    throw new AppError(
      "removePageCollaborator: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to remove collaborator", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to remove collaborator");
  }
};
