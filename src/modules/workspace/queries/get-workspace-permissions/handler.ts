/**
 * getWorkspacePermissions — Query Handler (thin orchestrator)
 *
 * Returns all workspace-scoped permissions (module = "workspace").
 * Used by the workspace roles & permissions settings page to populate
 * the permission toggle matrix for workspace role editing.
 *
 * Auth:
 *   - ctx.auth.userId must be present (authenticated user)
 *   - assertWorkspaceMember — caller must belong to the workspace
 *
 * Steps:
 *   1. [auth] assertWorkspaceMember
 *   2. fetchWorkspacePermissions — return module='workspace' permissions sorted by resource+action
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspacePermissionsInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchWorkspacePermissions } from "./steps/fetch-workspace-permissions";

export const getWorkspacePermissions = async (
  input: GetWorkspacePermissionsInput,
  ctx: ServiceContext
) => {
  const { workspaceId } = input;
  if (!ctx.authGate || !ctx.auth.userId) throw AppError.unauthorized();

  // Step 1: Ensure caller is a workspace member
  await ctx.authGate.assertWorkspaceMember(workspaceId);

  // Step 2: Fetch workspace-scoped permissions only
  return fetchWorkspacePermissions(ctx.db);
};
