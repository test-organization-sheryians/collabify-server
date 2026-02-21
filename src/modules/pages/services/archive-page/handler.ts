/**
 * archivePage — Service Handler
 *
 * Archives a single page (sets isArchived = true). Descendants are NOT
 * recursively archived — see README improvement plan.
 *
 * Execution:
 *   Step 1 — checkAccess  : page exists + EDITOR role gate
 *   Step 2 — setArchived  : DB update isArchived = true
 *   Step 3 — broadcast    : PUBLISH page:archived event (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ArchivePageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { setArchived } from "./steps/set-archived";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:archive-page");

export const handler = async (input: ArchivePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

    // Step 2 — DB update
    const page = await setArchived(input.pageId, ctx.db);

    // Step 3 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after archive", {
        err,
        pageId: input.pageId,
      })
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
