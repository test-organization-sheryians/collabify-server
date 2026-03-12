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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // Step 0a — page collaborator gate (cache-backed); fetch workspaceId for scope
  await ctx.authGate.assertPageCollaborator(input.pageId);

  const page = await ctx.db.page.findFirst({
    where: {
      id: input.pageId,
      deletedAt: null,
    },
    select: {
      id: true,
      s3Key: true,
      lastSnapshotStreamId: true,
      lastSnapshotAt: true,
      workspaceId: true,
    },
  });

  if (!page) {
    throw AppError.notFound("Page not found");
  }

  // Step 0b — RBAC permission check (workspace-scoped)
  await ctx.permissions.assert("page:read", { type: "workspace", id: page.workspaceId });

  const { workspaceId: _ws, ...pageRow } = page;
  return pageRow as PageRow;
}
