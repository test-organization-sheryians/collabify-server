/**
 * getAllPermissions — Query Handler (thin orchestrator)
 *
 * Returns the permission catalogue scoped to project-relevant permissions
 * (excludes workspace-management permissions not applicable to project roles).
 *
 * Auth:
 *   - ctx.auth.userId must be present (authenticated user)
 *   - assertWorkspaceMember — caller must belong to the workspace
 *
 * Steps:
 *   1. [auth] assertWorkspaceMember
 *   2. fetchProjectPermissions — return project-scoped permissions, sorted by resource+action
 */
import { AppError } from "@/shared/errors";
import type { GetAllPermissionsInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectPermissions } from "./steps/fetch-project-permissions";

export const getAllPermissions = async (
  input: GetAllPermissionsInput,
  ctx: ServiceContext
) => {
  if (!ctx.authGate || !ctx.auth.userId) throw AppError.unauthorized();
  const { workspaceId } = input;

  // Step 1: Ensure caller is a workspace member
  await ctx.authGate.assertWorkspaceMember(workspaceId);

  // Step 2: Fetch project-relevant permissions only
  return fetchProjectPermissions(ctx.db);
};
