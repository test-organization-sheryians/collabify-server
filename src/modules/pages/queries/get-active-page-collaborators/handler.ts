/**
 * getActivePageCollaborators — Query Handler
 *
 * Returns live presence from Redis ZSET, NOT the authoritative DB collaborator list.
 * For persistent collaborator list (all users with access), use getPageCollaborators.
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:collaborator:read") — parallel (cache-backed)
 *   Step 2 — fetchActiveIds    : ZRANGE page:{id}:subscribers → userId[]
 *   Step 3 — fetchUserProfiles : user.findMany batch + join → ActiveCollaborator[]
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetActivePageCollaboratorsInput } from "./schema";
import { fetchActiveIds } from "./steps/fetch-active-ids";
import { fetchUserProfiles } from "./steps/fetch-user-profiles";

const logger = createLogger("pages:queries:get-active-page-collaborators");

export const getActivePageCollaboratorsHandler = async (
  input: GetActivePageCollaboratorsInput,
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
      ctx.permissions.assert("page:collaborator:read", scope),
    ]);

    // Step 2 — presence ZSET read
    const activeIds = await fetchActiveIds(input.pageId, ctx.redis);
    if (activeIds.length === 0) return [];

    // Step 3 — batch user lookup + join
    return fetchUserProfiles(activeIds, ctx.db);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get active collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to fetch active collaborators");
  }
};
