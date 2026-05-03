/**
 * unarchivePage — Service Handler
 *
 * Restores a single archived page. Parent must not be archived (see step 2).
 * Descendant pages are NOT recursively unarchived — each must be restored individually.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:archive") — parallel (cache-backed)
 *   Step 2 — guardParentNotArchived  : parent page must be active first
 *   Step 3 — setUnarchived           : page.update({ isArchived: false })
 *   Step 4 — broadcast               : PUBLISH page:unarchived (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UnarchivePageInput } from "./schema";
import { guardParentNotArchived } from "./steps/guard-parent-not-archived";
import { setUnarchived } from "./steps/set-unarchived";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:unarchive-page");

export const handler = async (
  input: UnarchivePageInput,
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
      ctx.permissions.assert("page:archive", scope),
    ]);

    // Step 2 — parent archived guard
    await guardParentNotArchived(input.pageId, ctx.db);

    // Step 3 — DB update
    const page = await setUnarchived(input.pageId, ctx.db);

    // Step 4 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after unarchive", {
        err,
        pageId: input.pageId,
      })
    );

    logger.info("Page unarchived", { pageId: input.pageId, userId });
    return { page };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to unarchive page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to unarchive page");
  }
};
