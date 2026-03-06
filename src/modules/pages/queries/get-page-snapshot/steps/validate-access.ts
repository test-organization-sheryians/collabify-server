/**
 * Step 1 — Validate Access
 *
 * Fetches the page and verifies the requesting user is either the creator or
 * an explicit collaborator. Returns the minimal page row needed for subsequent steps.
 *
 * Throws AppError.forbidden() if:
 *   - Page doesn't exist
 *   - Page has been soft-deleted
 *   - User is neither creator nor collaborator
 */

import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetPageSnapshotInput } from "../index";
import type { PageRow } from "../types";

export async function validateAccess(
  input: GetPageSnapshotInput,
  ctx: ServiceContext,
  userId: string
): Promise<PageRow> {
  const page = await ctx.db.page.findFirst({
    where: {
      id: input.pageId,
      deletedAt: null,
      OR: [{ createdBy: userId }, { collaborators: { some: { userId } } }],
    },
    select: {
      id: true,
      s3Key: true,
      lastSnapshotStreamId: true,
      lastSnapshotAt: true,
    },
  });

  if (!page) {
    throw AppError.forbidden("Page not found or you do not have access");
  }

  return page;
}
