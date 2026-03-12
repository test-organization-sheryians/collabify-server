/**
 * deleteWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceOwner — cache-backed; FORBIDDEN if not OWNER
 *   - permissions.assert("workspace:delete") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceOwner + assert("workspace:delete") — parallel
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
  await Promise.all([
    ctx.authGate.assertWorkspaceOwner(workspaceId),
    ctx.permissions.assert("workspace:delete", scope),
  ]);

  await softDeleteWorkspace(workspaceId, db);
  return true;
};
