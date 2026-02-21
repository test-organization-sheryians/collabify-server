/**
 * removePageCollaborator — Service Handler
 *
 * Removes a collaborator from a page. Hard-deletes the record.
 * The creator cannot be removed (see guardCreator step).
 *
 * Execution:
 *   Step 1 — checkAccess       : page exists + EDITOR role gate
 *   Step 2 — guardCreator      : prevent removing the page creator
 *   Step 3 — deleteCollaborator: hard-delete pageCollaborator record
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RemovePageCollaboratorInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { guardCreator } from "./steps/guard-creator";
import { deleteCollaborator } from "./steps/delete-collaborator";

const logger = createLogger("pages:services:remove-page-collaborator");

export const handler = async (
  input: RemovePageCollaboratorInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

    // Step 2 — creator guard (cannot remove page owner)
    await guardCreator(input.pageId, input.userId, ctx.db);

    // Step 3 — hard-delete collaborator record
    await deleteCollaborator(input.pageId, input.userId, ctx.db);

    logger.info("Collaborator removed", {
      pageId: input.pageId,
      targetUserId: input.userId,
      removedBy: userId,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to remove collaborator", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to remove page collaborator");
  }
};
