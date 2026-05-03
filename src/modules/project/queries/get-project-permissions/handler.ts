/**
 * getProjectPermissions — Query Handler (thin orchestrator)
 *
 * Returns all project-scoped permissions (module = "project"), excluding
 * project:create (WorkspaceScope-only). Used by the project roles & permissions
 * settings page to populate the permission toggle matrix.
 *
 * Auth:
 *   - ctx.auth.userId must be present
 *   - assertProjectMember — caller must be a member of the project
 *
 * Steps:
 *   1. [auth] assertProjectMember
 *   2. fetchProjectRolePermissions — return module='project' permissions
 */
import { AppError } from "@/shared/errors";
import type { GetProjectPermissionsInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectRolePermissions } from "./steps/fetch-project-role-permissions";

export const getProjectPermissions = async (
  input: GetProjectPermissionsInput,
  ctx: ServiceContext
) => {
  const { projectId } = input;
  if (!ctx.authGate || !ctx.auth.userId) throw AppError.unauthorized();

  // Step 1: Ensure caller is a project member
  await ctx.authGate.assertProjectMember(projectId);

  // Step 2: Fetch project-scoped permissions only
  return fetchProjectRolePermissions(ctx.db);
};
