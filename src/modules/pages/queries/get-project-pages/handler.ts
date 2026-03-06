/**
 * getProjectPages — Query Handler
 *
 * Returns the full nested page tree for a project.
 * Archived pages are included — client decides whether to display the archive section.
 *
 * Execution:
 *   Step 1 — checkAccess     : project exists + workspace membership gate
 *   Step 2 — fetchFlatPages  : single DB query (position ASC)
 *   Step 3 — buildTree       : O(N) in-memory BFS — pure sync, no IO
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectPagesInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { fetchFlatPages } from "./steps/fetch-flat-pages";
import { buildTree } from "./steps/build-tree";

const logger = createLogger("pages:queries:get-project-pages");

export const getProjectPagesHandler = async (
  input: GetProjectPagesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — project exists + workspace member check
    await checkAccess(input.projectId, userId, ctx.db);

    // Step 2 — flat DB fetch (all non-deleted pages, position ASC)
    const flat = await fetchFlatPages(input.projectId, userId, ctx.db);
    if (flat.length === 0) return [];

    // Step 3 — O(N) in-memory tree build (no DB calls)
    return buildTree(flat);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get project pages", {
      err: error,
      userId,
      projectId: input.projectId,
    });
    throw new AppError("Failed to fetch project pages");
  }
};
