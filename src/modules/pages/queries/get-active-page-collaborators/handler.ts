/**
 * getActivePageCollaborators — Query Handler
 *
 * Returns live presence from Redis ZSET, NOT the authoritative DB collaborator list.
 * For persistent collaborator list (all users with access), use getPageCollaborators.
 *
 * Execution:
 *   Step 1 — checkAccess       : verify caller is a page collaborator
 *   Step 2 — fetchActiveIds    : ZRANGE page:{id}:subscribers → userId[]
 *   Step 3 — fetchUserProfiles : user.findMany batch + join → ActiveCollaborator[]
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetActivePageCollaboratorsInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { fetchActiveIds } from "./steps/fetch-active-ids";
import { fetchUserProfiles } from "./steps/fetch-user-profiles";

const logger = createLogger("pages:queries:get-active-page-collaborators");

export const getActivePageCollaboratorsHandler = async (
  input: GetActivePageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — access gate
    await checkAccess(input.pageId, userId, ctx.db);

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
