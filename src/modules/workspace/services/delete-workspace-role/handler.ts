/**
 * deleteWorkspaceRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:role:delete") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:role:delete")
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
  await ctx.permissions.assert("workspace:role:delete", scope);

  // Collect members BEFORE deletion (cannot query after role is dropped)
  const roleMembers = await ctx.db.workspaceMember.findMany({
    where: { roleId },
    select: { userId: true },
  });

  const result = await removeRole(roleId, workspaceId, ctx.db);

  // Invalidate permission cache for all members that were holding this role
  await ctx.permissions.invalidate.invalidateRole(
    roleId,
    roleMembers.map((m) => m.userId)
  );

  return result;
};
