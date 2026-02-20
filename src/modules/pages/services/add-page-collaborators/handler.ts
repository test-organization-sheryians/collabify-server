import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { AddPageCollaboratorsInput } from "./schema";

const logger = createLogger("pages:services:add-page-collaborators");

/**
 * addPageCollaborators handler — upsert-semantics (invite + role changes).
 *
 * Workflow:
 * 1. Auth + EDITOR check on the page
 * 2. Validate all target userIds exist
 * 3. createMany with skipDuplicates=false (upsert via loop for role update semantics)
 * 4. Return { addedCollaborators }
 */
export const handler = async (
  input: AddPageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Access check
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    const callerCollab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!callerCollab || callerCollab.role !== "EDITOR") {
      throw AppError.forbidden("Only editors can manage collaborators");
    }

    // Step 2 — Validate target users exist
    const targetIds = input.collaborators.map((c) => c.userId);
    const existingUsers = await ctx.db.user.findMany({
      where: { id: { in: targetIds } },
      select: { id: true },
    });
    const foundIds = new Set(existingUsers.map((u) => u.id));
    const missing = targetIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw AppError.notFound(`Users not found: ${missing.join(", ")}`);
    }

    // Step 3 — Upsert collaborators (update role if already exists)
    const upserted = await Promise.all(
      input.collaborators.map((c) =>
        ctx.db.pageCollaborator.upsert({
          where: { pageId_userId: { pageId: input.pageId, userId: c.userId } },
          create: {
            pageId: input.pageId,
            userId: c.userId,
            role: c.role as any,
          },
          update: { role: c.role as any },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        })
      )
    );

    logger.info("Collaborators added/updated", {
      pageId: input.pageId,
      count: upserted.length,
      userId,
    });
    return { addedCollaborators: upserted };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to add collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to add page collaborators");
  }
};
