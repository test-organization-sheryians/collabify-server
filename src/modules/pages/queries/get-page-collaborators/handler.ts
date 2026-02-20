import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { GetPageCollaboratorsInput } from "./index";

const logger = createLogger("pages:queries:get-page-collaborators");

/**
 * getPageCollaborators handler — authoritative DB collaborator list.
 *
 * Workflow:
 * 1. Auth + access check (must be a collaborator)
 * 2. Fetch all collaborators with user join
 * 3. Return { collaborators }
 */
export const getPageCollaboratorsHandler = async (
  input: GetPageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Access check
    const collab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!collab) throw AppError.forbidden("Not a collaborator on this page");

    // Step 2 — Fetch all collaborators with user data for the mapper
    const collaborators = await ctx.db.pageCollaborator.findMany({
      where: { pageId: input.pageId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

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
