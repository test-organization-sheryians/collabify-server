/**
 * getRolePermissions — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — any member can view role permissions (for UI permission picker)
 * Steps:
 *   1. [auth] assertWorkspaceMember
 *   2. fetchRolePermissions — return RolePermission[] with nested Permission
 */
import { AppError } from "@/shared/errors";
import type { GetRolePermissionsInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchRolePermissions } from "./steps/fetch-role-permissions";

export const getRolePermissions = async (
  input: GetRolePermissionsInput,
  ctx: ServiceContext
) => {
  const { roleId, workspaceId } = input;
  if (!ctx.authGate) throw AppError.unauthorized();
  await ctx.authGate.assertWorkspaceMember(workspaceId);
  return fetchRolePermissions(roleId, ctx.db);
};
