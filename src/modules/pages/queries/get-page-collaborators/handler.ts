/**
 * getPageCollaborators — Query Handler
 *
 * Returns the authoritative DB collaborator list with role + user profile.
 * For live presence (currently online users), use getActivePageCollaborators.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:collaborator:read") — parallel (cache-backed)
 *   Step 2 — fetchCollaborators  : findMany with user join, ordered joinedAt ASC
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetPageCollaboratorsInput } from "./schema";
import { fetchCollaborators } from "./steps/fetch-collaborators";

const logger = createLogger("pages:queries:get-page-collaborators");

export const getPageCollaboratorsHandler = async (
  input: GetPageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — collaborator-only gate (cache-backed)
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
      ctx.permissions.assert("page:collaborator:read", scope),
    ]);

    // Step 2 — fetch full list with user join
    const collaborators = await fetchCollaborators(input.pageId, ctx.db);

    return { collaborators };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to fetch page collaborators");
  }
};
