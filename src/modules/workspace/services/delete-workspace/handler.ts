/**
 * deleteWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:delete") — OWNER only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:delete")
 *   2. softDeleteWorkspace — set deletedAt = now
 */
import { AppError } from "@/shared/errors";
import type { DeleteWorkspaceInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { softDeleteWorkspace } from "./steps/soft-delete-workspace";

export const deleteWorkspace = async (
  input: DeleteWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:delete", scope);

  await softDeleteWorkspace(workspaceId, db);
  return true;
};
