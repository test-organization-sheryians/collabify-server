/**
 * updateWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:update") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:update")
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
  await ctx.permissions.assert("workspace:update", scope);

  return updateWorkspaceFields(
    workspaceId,
    { name, logoUrl, domainWhitelist },
    db
  );
};
