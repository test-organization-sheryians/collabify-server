import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { GetPageInput } from "./index";

const logger = createLogger("pages:queries:get-page");

/**
 * getPage handler — fetch page metadata by ID.
 *
 * Workflow:
 * 1. Auth
 * 2. Fetch page (deletedAt = null guard)
 * 3. Collaborator OR workspace-member access check
 * 4. Return page
 */
export const getPageHandler = async (
  input: GetPageInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page
    // TODO: const page = await ctx.db.page.findFirst({
    //   where: { id: input.pageId, deletedAt: null },
    // })
    // if (!page) throw AppError.notFound("Page not found")

    // Step 2 — Access check (page collaborator OR workspace member)
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // if (!collab) {
    //   const member = await ctx.db.workspaceMember.findFirst({ where: { userId, workspace: { projects: { some: { id: page.projectId } } } } })
    //   if (!member) throw AppError.forbidden("You do not have access to this page")
    // }

    // Step 3 — Return (resolver applies toGraphQLPage mapper)
    // return page

    throw new AppError("getPage: not yet implemented", "INTERNAL_SERVER_ERROR");
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
