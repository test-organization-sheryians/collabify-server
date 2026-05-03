/**
 * deletePage — Service Handler
 *
 * Soft-deletes a page. The page record is NOT removed — deletedAt is set,
 * making the page invisible to all queries that guard deletedAt: null.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:delete") — parallel (cache-backed)
 *   Step 2 — checkNoActiveSubscribers  : ZCARD guard — no active editing sessions
 *   Step 3 — softDelete                : page.update({ deletedAt: now() })
 *   Step 4 — broadcast                 : PUBLISH page:deleted (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeletePageInput } from "./schema";
import { checkNoActiveSubscribers } from "./steps/check-no-active-subscribers";
import { softDelete } from "./steps/soft-delete";
import { broadcast } from "./steps/broadcast";
import { emit } from "@/modules/notification/outbox/outbox-writer";
import { orphanMentions } from "@/modules/mention/services";

const logger = createLogger("pages:services:delete-page");

export const handler = async (input: DeletePageInput, ctx: ServiceContext) => {
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
      ctx.permissions.assert("page:delete", scope),
    ]);

    // Step 2 — no active subscribers guard
    await checkNoActiveSubscribers(input.pageId, ctx.redis);

    // Step 3 — soft delete
    await softDelete(input.pageId, ctx.db);

    // Step 3b — orphan mentions targeting this page
    await orphanMentions.handler({ targetEntityId: input.pageId }, ctx);

    // Step 4 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after delete", {
        err,
        pageId: input.pageId,
      })
    );

    // Step 5 — emit notification
    await emit(ctx.db as any, {
      type: "page.deleted",
      payload: {
        pageId: input.pageId,
        pageTitle: (cachedPage as any).title ?? "Untitled",
        workspaceId: proj?.workspaceId ?? "",
        workspaceSlug: proj?.slug ?? "",
        actorId: userId,
        actorName: "Someone",
        collaboratorIds: [],
      } as any,
      deduplicationId: `page.deleted:${input.pageId}:${Date.now()}`,
    }).catch((err) =>
      logger.error("Failed to emit page.deleted notification", { err, pageId: input.pageId })
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
