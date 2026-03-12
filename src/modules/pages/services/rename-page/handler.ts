/**
 * renamePage — Service Handler
 *
 * Updates the page title in the DB and broadcasts the change to connected clients.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:update") — parallel (cache-backed)
 *   Step 2 — updateTitle  : page.update({ title })
 *   Step 3 — broadcast    : PUBLISH page:renamed with new title (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RenamePageInput } from "./schema";
import { updateTitle } from "./steps/update-title";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:rename-page");

export const handler = async (input: RenamePageInput, ctx: ServiceContext) => {
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
      ctx.permissions.assert("page:update", scope),
    ]);

    // Step 2 — DB update
    const page = await updateTitle(input.pageId, input.title, ctx.db);

    // Step 3 — broadcast (best-effort)
    await broadcast(input.pageId, input.title, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after rename", {
        err,
        pageId: input.pageId,
      })
    );

    logger.info("Page renamed", {
      pageId: input.pageId,
      title: input.title,
      userId,
    });
    return { page };
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
