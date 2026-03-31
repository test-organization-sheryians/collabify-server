/**
 * getActiveContext — Query Handler (thin orchestrator)
 *
 * Returns the authenticated user's full authorization context for a given scope:
 *   - workspace role name
 *   - project role name (if projectId provided)
 *   - all granted permissions at the scope (cached via PermissionEngine)
 *   - all relevant feature flags (resolved via FeatureFlagEngine)
 *
 * Auth:
 *   - User must be a workspace member to call this query
 * Steps:
 *   1. [auth] assert workspace membership
 *   2. fetchWorkspaceContext — resolve role names
 *   3. permissions.getAllGrantedPermissions — build permission list
 *   4. flags.getAll — resolve all known feature flags
 */
import { AppError } from "@/shared/errors";
import type { GetActiveContextInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchWorkspaceContext } from "./steps/fetch-workspace-context";

/** Feature flag keys known to the system. Extend as new flags are added. */
const KNOWN_FLAGS = [
  "ai.summary",
  "ai.autocomplete",
  "vault.video-preview",
  "pages.comments",
  "issues.priority-matrix",
] as const;

export const getActiveContext = async (
  input: GetActiveContextInput,
  ctx: ServiceContext
) => {
  const { workspaceId, projectId, actorUserId } = input;

  if (!ctx.permissions || !ctx.flags) throw AppError.unauthorized();

  const scope = projectId
    ? ({ type: "project" as const, id: projectId, workspaceId })
    : ({ type: "workspace" as const, id: workspaceId });

  // Step 1: Verify user is a workspace member (workspace:read)
  await ctx.permissions.assert("workspace:read", { type: "workspace", id: workspaceId });

  // Step 2: Resolve role names
  const { workspaceRole, projectRole } = await fetchWorkspaceContext(
    actorUserId,
    workspaceId,
    projectId,
    ctx.db
  );

  // Step 3: Load all granted permissions for this scope
  const grantedPermissions = await ctx.permissions.getAllGrantedPermissions(scope);

  // Step 4: Resolve feature flags — parallel resolution
  const flagMap = await ctx.flags.getAll([...KNOWN_FLAGS]);
  const featureFlags = Object.entries(flagMap).map(([key, enabled]) => ({ key, enabled }));

  return {
    userId: actorUserId,
    workspaceId,
    projectId: projectId ?? null,
    workspaceRole,
    projectRole,
    grantedPermissions,
    featureFlags,
  };
};
