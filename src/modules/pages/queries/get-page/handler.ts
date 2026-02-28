/**
 * getPage — Query Handler
 *
 * Fetches page metadata by ID. No content (Y.Doc) — use getPageSnapshot for that.
 *
 * Execution:
 *   Step 1 — fetchPage    : DB fetch with soft-delete guard
 *   Step 2 — checkAccess  : collaborator OR workspace-member gate
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetPageInput } from "./schema";
import { fetchPage } from "./steps/fetch-page";
import { checkAccess } from "./steps/check-access";

const logger = createLogger("pages:queries:get-page");

export const getPageHandler = async (
  input: GetPageInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — fetch page (NOT_FOUND if deleted or missing)
    const page = await fetchPage(input.pageId, ctx.db);

    // Step 2 — access gate (collaborator OR workspace member)
    await checkAccess(input.pageId, page.workspaceId, userId, ctx.db);

    return page;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to fetch page");
  }
};
