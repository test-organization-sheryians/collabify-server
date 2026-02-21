/**
 * deletePage — Service Handler
 *
 * Soft-deletes a page. The page record is NOT removed — deletedAt is set,
 * making the page invisible to all queries that guard deletedAt: null.
 *
 * Execution:
 *   Step 1 — checkAccess               : page exists + EDITOR role gate
 *   Step 2 — checkNoActiveSubscribers  : ZCARD guard — no active editing sessions
 *   Step 3 — softDelete                : page.update({ deletedAt: now() })
 *   Step 4 — broadcast                 : PUBLISH page:deleted (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeletePageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { checkNoActiveSubscribers } from "./steps/check-no-active-subscribers";
import { softDelete } from "./steps/soft-delete";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:delete-page");

export const handler = async (input: DeletePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

    // Step 2 — no active subscribers guard
    await checkNoActiveSubscribers(input.pageId, ctx.redis);

    // Step 3 — soft delete
    await softDelete(input.pageId, ctx.db);

    // Step 4 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after delete", {
        err,
        pageId: input.pageId,
      })
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
