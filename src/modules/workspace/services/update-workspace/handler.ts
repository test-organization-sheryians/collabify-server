/**
 * updateWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — cache-backed; FORBIDDEN if rank < ADMIN
 *   - permissions.assert("workspace:update") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace:update") — parallel
 *   2. updateWorkspaceFields — update name/logoUrl/domainWhitelist; return workspace
 */
import { AppError } from "@/shared/errors";
import type { UpdateWorkspaceInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateWorkspaceFields } from "./steps/update-workspace-fields";

export const updateWorkspace = async (
  input: UpdateWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, name, logoUrl, domainWhitelist } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace:update", scope),
  ]);

  return updateWorkspaceFields(
    workspaceId,
    { name, logoUrl, domainWhitelist },
    db
  );
};
