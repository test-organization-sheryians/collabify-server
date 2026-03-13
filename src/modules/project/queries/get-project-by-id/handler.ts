/**
 * getProjectById — Query Handler
 *
 * Auth:
 *   - assertWorkspaceMember — user must be in the workspace
 *   - assertProjectMember   — user must be a direct project member
 *                            (skipped for workspace admins/owners)
 */
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectByIdInput } from "./types";
import { AppError } from "@/shared/errors";

export const getProjectById = async (
  input: GetProjectByIdInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const { id } = input;

  if (!ctx.dataloaders.project?.projectById) {
    throw new Error("Project DataLoaders not initialized");
  }

  // 1. Resolve project metadata from cache (no extra DB round-trip on hit)
  const meta = await ctx.authGate.getProject(id);
  if (!meta) throw AppError.notFound("Project not found");

  // 2. Workspace gate — cheap, cached
  await ctx.authGate.assertWorkspaceMember(meta.workspaceId);

  // 3. Project gate — admins bypass
  const isAdmin = await ctx.authGate.isWorkspaceAdminOrAbove(meta.workspaceId);
  if (!isAdmin) {
    await ctx.authGate.assertProjectMember(id);
  }

  return ctx.dataloaders.project.projectById.load(id);
};

