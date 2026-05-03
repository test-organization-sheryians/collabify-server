/**
 * archivePage — Service Handler
 *
 * Archives a single page (sets isArchived = true). Descendants are NOT
 * recursively archived — see README improvement plan.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:archive") — parallel (cache-backed)
 *   Step 2 — setArchived  : DB update isArchived = true
 *   Step 3 — broadcast    : PUBLISH page:archived event (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ArchivePageInput } from "./schema";
import { setArchived } from "./steps/set-archived";
import { broadcast } from "./steps/broadcast";
import { emit } from "@/modules/notification/outbox/outbox-writer";

const logger = createLogger("pages:services:archive-page");

export const handler = async (input: ArchivePageInput, ctx: ServiceContext) => {
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
      ctx.permissions.assert("page:archive", scope),
    ]);

    // Step 2 — DB update
    const page = await setArchived(input.pageId, ctx.db);

    // Step 3 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after archive", {
        err,
        pageId: input.pageId,
      })
    );

    // Step 4 — emit notification
    await emit(ctx.db as any, {
      type: "page.archived",
      payload: {
        pageId: page.id,
        pageTitle: (cachedPage as any).title ?? "Untitled",
        workspaceId: proj?.workspaceId ?? "",
        workspaceSlug: proj?.slug ?? "",
        actorId: userId,
        actorName: "Someone",
        collaboratorIds: [],
      } as any,
      deduplicationId: `page.archived:${page.id}:${Date.now()}`,
    }).catch((err) =>
      logger.error("Failed to emit page.archived notification", { err, pageId: input.pageId })
    );

    logger.info("Page archived", { pageId: input.pageId, userId });
    return { page };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to archive page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to archive page");
  }
};
