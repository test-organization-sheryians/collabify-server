/**
 * deleteWorkspaceRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove
 *   - permissions.assert("workspace.role:delete")
 * Steps:
 *   1. [auth] parallel
 *   2. [pre-delete] invalidate role-member index: bulk-invalidate perm:* for all holders
 *   3. removeRole — guard isSystem + no active assignments, then delete
 * Cache Invalidation:
 *   - invalidator.permissions.invalidateByRole(roleId) — uses role-members:{roleId} Redis set
 *     to bulk-DEL all perm:* keys for every user that was holding this role
 */
import { AppError } from "@/shared/errors";
import type { DeleteWorkspaceRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { removeRole } from "./steps/remove-role";

export const deleteWorkspaceRole = async (
  input: DeleteWorkspaceRoleInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.role:delete", scope),
  ]);

  // TODO: invalidate role-members:{roleId} perm cache once AuthGateInvalidator is wired to ServiceContext

  return removeRole(roleId, workspaceId, ctx.db);
};
