import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { AddPageCollaboratorsInput } from "./schema";

const logger = createLogger("pages:services:add-page-collaborators");

/**
 * addPageCollaborators handler (upsert semantics)
 *
 * Workflow:
 * 1. Auth
 * 2. Page + EDITOR check
 * 3. Validate each userId is a workspace member
 * 4. Upsert PageCollaborator rows (createMany skipDuplicates)
 * 5. Return created/updated collaborators
 */
export const handler = async (
  input: AddPageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null }, select: { id: true, project: { select: { workspaceId: true } } } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab || collab.role !== 'EDITOR') throw AppError.forbidden("Only editors can manage collaborators")

    // Step 2 — Validate all collaborators are workspace members
    // TODO: const unique = [...new Set(input.collaborators.map(c => c.userId))]
    // TODO: const members = await ctx.db.workspaceMember.findMany({ where: { workspaceId: page.project.workspaceId, userId: { in: unique } }, select: { userId: true } })
    // TODO: const validUserIds = new Set(members.map(m => m.userId))
    // Log warning for any invalid users (graceful degradation — match whiteboard pattern)

    // Step 3 — Upsert (createMany + skipDuplicates)
    // TODO: await ctx.db.pageCollaborator.createMany({ data: input.collaborators.filter(c => validUserIds.has(c.userId)).map(c => ({ pageId: input.pageId, userId: c.userId, role: c.role })), skipDuplicates: true })

    // Step 4 — Fetch created collaborators for response
    // TODO: const added = await ctx.db.pageCollaborator.findMany({ where: { pageId: input.pageId, userId: { in: [...validUserIds] } }, include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } } })

    // logger.info("Collaborators added", { pageId: input.pageId, count: added.length, userId })
    // return { addedCollaborators: added }

    throw new AppError(
      "addPageCollaborators: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to add collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to add collaborators");
  }
};
