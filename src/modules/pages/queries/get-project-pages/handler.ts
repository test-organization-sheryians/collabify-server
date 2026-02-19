import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { GetProjectPagesInput } from "./index";

const logger = createLogger("pages:queries:get-project-pages");

/**
 * getProjectPages handler — returns full nested page tree.
 *
 * Workflow:
 * 1. Auth + project membership check
 * 2. Fetch all non-deleted pages for project (flat list, single query)
 * 3. Build in-memory tree (O(N) BFS — no recursive DB queries)
 * 4. Return root pages (with nested children)
 */
export const getProjectPagesHandler = async (
  input: GetProjectPagesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Check project access
    // TODO: const project = await ctx.db.project.findUnique({ where: { id: input.projectId }, select: { workspaceId: true } })
    // if (!project) throw AppError.notFound("Project not found")
    // const member = await ctx.db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } } })
    // if (!member) throw AppError.forbidden("You are not a member of this workspace")

    // Step 2 — Flat page fetch
    // TODO: const flat = await ctx.db.page.findMany({ where: { projectId: input.projectId, deletedAt: null }, orderBy: { position: 'asc' } })

    // Step 3 — O(N) BFS tree builder
    // TODO: const pageMap = new Map(flat.map(p => [p.id, { ...p, children: [] as typeof flat }]))
    // const roots: typeof flat = []
    // for (const page of pageMap.values()) {
    //   if (page.parentId) pageMap.get(page.parentId)?.children.push(page)
    //   else roots.push(page)
    // }

    // Step 4 — Return (resolver applies toGraphQLPage per node)
    // return roots

    throw new AppError(
      "getProjectPages: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
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
