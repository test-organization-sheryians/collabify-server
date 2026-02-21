/**
 * unarchivePage — Service Handler
 *
 * Restores a single archived page. Parent must not be archived (see step 2).
 * Descendant pages are NOT recursively unarchived — each must be restored individually.
 *
 * Execution:
 *   Step 1 — checkAccess             : page exists + EDITOR role gate
 *   Step 2 — guardParentNotArchived  : parent page must be active first
 *   Step 3 — setUnarchived           : page.update({ isArchived: false })
 *   Step 4 — broadcast               : PUBLISH page:unarchived (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UnarchivePageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
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

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

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
    if (error instanceof AppError)
      throw new AppError("Failed to unarchive page");
    logger.error("Failed to unarchive page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
  }
};
