/**
 * addPageCollaborators — Service Handler
 *
 * Upsert-semantics: invites new collaborators or updates existing roles in one call.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:collaborator:add") — parallel (cache-backed)
 *   Step 2 — validateUsers        : all target userIds must exist in DB
 *   Step 3 — upsertCollaborators  : parallel upsert (create + role update) with user join
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { AddPageCollaboratorsInput } from "./schema";
import { validateUsers } from "./steps/validate-users";
import { upsertCollaborators } from "./steps/upsert-collaborators";
import { emit } from "@/modules/notification/outbox/outbox-writer";

const logger = createLogger("pages:services:add-page-collaborators");

export const handler = async (
  input: AddPageCollaboratorsInput,
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
      ctx.permissions.assert("page:collaborator:add", scope),
    ]);

    // Step 2 — pre-flight user existence check
    const targetIds = input.collaborators.map((c) => c.userId);
    await validateUsers(targetIds, ctx.db);

    // Step 3 — parallel upsert with user join
    const addedCollaborators = await upsertCollaborators(
      input.pageId,
      input.collaborators,
      ctx.db
    );

    // Step 4 — emit notification for each collaborator added
    for (const collaborator of addedCollaborators) {
      await emit(ctx.db as any, {
        type: "page.collaborator.added",
        payload: {
          pageId: input.pageId,
          pageTitle: (cachedPage as any).title ?? "Untitled",
          workspaceId: proj?.workspaceId ?? "",
          workspaceSlug: proj?.slug ?? "",
          newMemberId: collaborator.userId,
          actorId: userId,
          actorName: "Someone",
          accessLevel: collaborator.role ?? "viewer",
        } as any,
        deduplicationId: `page.collaborator.added:${input.pageId}:${collaborator.userId}:${Date.now()}`,
      }).catch((err) =>
        logger.error("Failed to emit page.collaborator.added notification", {
          err,
          pageId: input.pageId,
          collaboratorId: collaborator.userId,
        })
      );
    }

    logger.info("Collaborators added/updated", {
      pageId: input.pageId,
      count: addedCollaborators.length,
      userId,
    });

    return { addedCollaborators };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to add collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to add page collaborators");
  }
};
