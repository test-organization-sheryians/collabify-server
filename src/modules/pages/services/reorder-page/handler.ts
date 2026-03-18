/**
 * reorderPage — Service Handler
 *
 * Moves a page to a new position in the tree. Supports moving to root
 * (newParentId = null) and fractional position indexing.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:update") — parallel (cache-backed)
 *   Step 2 — guardCircularAncestry  : O(D) ancestor walk — prevent cycle creation
 *   Step 3 — updatePosition         : page.update({ parentPageId, position })
 *   Step 4 — broadcast              : PUBLISH page:reordered with new position (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ReorderPageInput } from "./schema";
import { guardCircularAncestry } from "./steps/guard-circular-ancestry";
import { updatePosition } from "./steps/update-position";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:reorder-page");

export const handler = async (input: ReorderPageInput, ctx: ServiceContext) => {
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

    // Step 2 — cycle detection (O(D) ancestor walk)
    await guardCircularAncestry(input.pageId, input.newParentId, ctx.db);

    // Step 3 — DB update
    const page = await updatePosition(
      input.pageId,
      input.newParentId,
      input.newPosition,
      ctx.db
    );

    // Step 4 — broadcast (best-effort)
    await broadcast(
      input.pageId,
      input.newParentId,
      input.newPosition,
      userId,
      ctx.redis
    ).catch((err) =>
      logger.error("Broadcast failed after reorder", {
        err,
        pageId: input.pageId,
      })
    );

    logger.info("Page reordered", {
      pageId: input.pageId,
      newParentId: input.newParentId,
      newPosition: input.newPosition,
      userId,
    });
    return { page };
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
