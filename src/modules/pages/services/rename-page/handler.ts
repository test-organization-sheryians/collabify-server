/**
 * renamePage — Service Handler
 *
 * Updates the page title in the DB and broadcasts the change to connected clients.
 *
 * Execution:
 *   Step 1 — checkAccess  : page exists + EDITOR role gate
 *   Step 2 — updateTitle  : page.update({ title })
 *   Step 3 — broadcast    : PUBLISH page:renamed with new title (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RenamePageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { updateTitle } from "./steps/update-title";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:rename-page");

export const handler = async (input: RenamePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

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
