/**
 * removePageCollaborator — Service Handler
 *
 * Removes a collaborator from a page. Hard-deletes the record.
 * The creator cannot be removed (see guardCreator step).
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:collaborator:remove") — parallel (cache-backed)
 *   Step 2 — guardCreator      : prevent removing the page creator
 *   Step 3 — deleteCollaborator: hard-delete pageCollaborator record
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RemovePageCollaboratorInput } from "./schema";
import { guardCreator } from "./steps/guard-creator";
import { deleteCollaborator } from "./steps/delete-collaborator";
import { emit } from "@/modules/notification/outbox/outbox-writer";

const logger = createLogger("pages:services:remove-page-collaborator");

export const handler = async (
  input: RemovePageCollaboratorInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — EDITOR gate (cache-backed)
    const cachedPage = await ctx.authGate.getPage(input.pageId);
    if (!cachedPage) throw AppError.notFound("Page not found");
    const proj = await ctx.authGate.getProject(cachedPage.projectId);
    const scope = {
      type: "resource" as const,
      id: input.pageId,
      projectId: cachedPage.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertPageCollaborator(input.pageId),
      ctx.permissions.assert("page:collaborator:remove", scope),
    ]);

    // Step 2 — creator guard (cannot remove page owner)
    await guardCreator(input.pageId, input.userId, ctx.db);

    // Step 3 — hard-delete collaborator record
    await deleteCollaborator(input.pageId, input.userId, ctx.db);

    // Step 4 — emit notification
    await emit(ctx.db as any, {
      type: "page.collaborator.removed",
      payload: {
        pageId: input.pageId,
        pageTitle: (cachedPage as any).title ?? "Untitled",
        workspaceId: proj?.workspaceId ?? "",
        workspaceSlug: proj?.slug ?? "",
        removedUserId: input.userId,
        actorId: userId,
        actorName: "Someone",
      } as any,
      deduplicationId: `page.collaborator.removed:${input.pageId}:${input.userId}:${Date.now()}`,
    }).catch((err) =>
      logger.error("Failed to emit page.collaborator.removed notification", {
        err,
        pageId: input.pageId,
        removedUserId: input.userId,
      })
    );

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
