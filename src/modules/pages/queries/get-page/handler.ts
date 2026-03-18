/**
 * getPage — Query Handler
 *
 * Fetches page metadata by ID. No content (Y.Doc) — use getPageSnapshot for that.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:read") — parallel (cache-backed)
 *   Step 2 — fetchPage    : DB fetch with soft-delete guard
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetPageInput } from "./schema";
import { fetchPage } from "./steps/fetch-page";

const logger = createLogger("pages:queries:get-page");

export const getPageHandler = async (
  input: GetPageInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — access gate (cache-backed collaborator check)
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
      ctx.permissions.assert("page:read", scope),
    ]);

    // Step 2 — fetch page (NOT_FOUND if deleted or missing)
    return fetchPage(input.pageId, ctx.db);
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
