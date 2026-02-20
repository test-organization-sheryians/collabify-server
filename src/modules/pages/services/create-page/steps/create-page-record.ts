/**
 * Step: Create Page Record
 *
 * Runs a single Prisma $transaction that:
 * 1. Creates the Page row (s3Key left null — set after S3 upload in next step)
 * 2. Adds creator as PageCollaborator with role EDITOR
 * 3. Bulk-adds optional additional collaborators with role VIEWER
 *
 * The transaction rolls back atomically if any sub-step fails.
 * s3Key is intentionally null here — it is an explicit sentinel meaning
 * "row exists but snapshot not yet uploaded". getPageSnapshot handles this by
 * returning an empty Y.Doc.
 */

import type { ServiceContext } from "@/graphql/types";
import type { CreatePageInput } from "../schema";
import type { Page } from "@prisma/client";

export async function createPageRecord(
  input: CreatePageInput,
  ctx: ServiceContext,
  userId: string,
  validCollaboratorIds: string[]
): Promise<{ page: Page }> {
  const page = await ctx.db.$transaction(async (tx) => {
    // 1 — Create the page row
    const p = await tx.page.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        parentPageId: input.parentId ?? null,
        title: input.title ?? "Untitled",
        emojiIcon: input.icon ?? null,
        coverImageUrl: input.coverUrl ?? null,
        position: input.position,
        createdBy: userId,
        s3Key: null, // set after S3 upload
        isLocked: false,
        isArchived: false,
      },
    });

    // 2 — Creator gets EDITOR role
    await tx.pageCollaborator.create({
      data: { pageId: p.id, userId, role: "EDITOR" },
    });

    // 3 — Additional collaborators get VIEWER role (bulk insert)
    if (validCollaboratorIds.length > 0) {
      await tx.pageCollaborator.createMany({
        data: validCollaboratorIds.map((collaboratorId) => ({
          pageId: p.id,
          userId: collaboratorId,
          role: "VIEWER" as const,
        })),
        skipDuplicates: true,
      });
    }

    return p;
  });

  return { page };
}
