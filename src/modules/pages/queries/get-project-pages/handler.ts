/**
 * getProjectPages — Query Handler
 *
 * Returns the full nested page tree for a project.
 * Archived pages are included — client decides whether to display the archive section.
 *
 * Execution:
 *   Step 1 — [auth] assertProjectMember + assert("page:read") — parallel (cache-backed)
 *   Step 2 — fetchFlatPages  : single DB query (position ASC)
 *   Step 3 — buildTree       : O(N) in-memory BFS — pure sync, no IO
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectPagesInput } from "./schema";
import { fetchFlatPages } from "./steps/fetch-flat-pages";
import { buildTree } from "./steps/build-tree";

const logger = createLogger("pages:queries:get-project-pages");

export const getProjectPagesHandler = async (
  input: GetProjectPagesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — project member gate (cache-backed)
    const proj = await ctx.authGate.getProject(input.projectId);
    if (!proj) throw AppError.notFound("Project not found");
    const scope = {
      type: "project" as const,
      id: input.projectId,
      workspaceId: proj.workspaceId,
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(input.projectId),
      ctx.permissions.assert("page:read", scope),
    ]);

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
