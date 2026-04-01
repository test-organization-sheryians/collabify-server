/**
 * Step: Validate Access
 *
 * Checks 3 things before any write happens:
 * 1. User is a workspace member
 * 2. Project belongs to the workspace
 * 3. Parent page (if provided) belongs to the same project
 *
 * All 3 checks throw AppError on failure — validated before the DB transaction opens.
 */

import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreatePageInput } from "../schema";

export async function validateAccess(
  input: CreatePageInput,
  ctx: ServiceContext,
  userId: string
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // 1 — Workspace membership (cache-backed)
  await ctx.authGate.assertWorkspaceMember(input.workspaceId);

  // 2 — Project belongs to the workspace (needed to build project scope for RBAC)
  const project = await ctx.db.project.findUnique({
    where: { id: input.projectId },
    select: { workspaceId: true },
  });
  if (!project || project.workspaceId !== input.workspaceId) {
    throw AppError.badRequest("Invalid project for this workspace");
  }

  // 3 — RBAC check — project scope so project-role permissions are evaluated
  await ctx.permissions.assert("page:create", {
    type: "project",
    id: input.projectId,
    workspaceId: input.workspaceId,
  });

  // 3 — Parent page belongs to the same project (cross-project injection guard)
  if (input.parentId) {
    const parent = await ctx.db.page.findUnique({
      where: { id: input.parentId },
      select: { projectId: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt !== null) {
      throw AppError.badRequest("Parent page not found");
    }
    if (parent.projectId !== input.projectId) {
      throw AppError.badRequest("Parent page belongs to a different project");
    }
  }
}
