import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RemovePageCollaboratorInput } from "./schema";

const logger = createLogger("pages:services:remove-page-collaborator");

/**
 * removePageCollaborator handler
 *
 * Workflow:
 * 1. Auth + EDITOR check
 * 2. Guard: cannot remove the page creator
 * 3. DB delete
 * 4. Return { success: true }
 */
export const handler = async (
  input: RemovePageCollaboratorInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Access check
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    const callerCollab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!callerCollab || callerCollab.role !== "EDITOR") {
      throw AppError.forbidden("Only editors can remove collaborators");
    }

    // Step 2 — Creator guard
    if (page.createdBy === input.userId) {
      throw AppError.conflict(
        "Cannot remove the page creator as a collaborator"
      );
    }

    // Step 3 — DB delete
    await ctx.db.pageCollaborator.delete({
      where: { pageId_userId: { pageId: input.pageId, userId: input.userId } },
    });

    logger.info("Collaborator removed", {
      pageId: input.pageId,
      removedUserId: input.userId,
      removedBy: userId,
    });
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to remove collaborator", {
      err: error,
      userId,
      pageId: input.pageId,
      removedUserId: input.userId,
    });
    throw new AppError("Failed to remove page collaborator");
  }
};
