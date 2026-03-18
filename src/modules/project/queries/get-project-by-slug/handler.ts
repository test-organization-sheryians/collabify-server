/**
 * getProjectBySlug — Query Handler
 *
 * Auth:
 *   - assertWorkspaceMember — user must be in the workspace
 *   - assertProjectMember   — user must be a direct project member
 *                            (skipped for workspace admins/owners)
 */
import { SlugUtil } from "@/shared/utils/slug.util";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectBySlugInput } from "./types";
import { AppError } from "@/shared/errors";

export const getProjectBySlug = async (
  input: GetProjectBySlugInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const { workspaceId, slug } = input;
  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

  // 1. Workspace gate — cheap, cached
  await ctx.authGate.assertWorkspaceMember(workspaceId);

  // 2. Resolve project
  const project = await ctx.db.project.findFirst({
    where: { workspaceId, key: normalizedSlug },
  });

  if (!project) return null;

  // 3. Project gate — workspace admins can see all projects without being members
  const isAdmin = await ctx.authGate.isWorkspaceAdminOrAbove(workspaceId);
  if (!isAdmin) {
    await ctx.authGate.assertProjectMember(project.id);
  }

  return project;
};

