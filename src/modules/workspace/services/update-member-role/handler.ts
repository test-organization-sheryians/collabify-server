/**
 * updateMemberRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:member:role-update") — OWNER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:member:role-update")
 *   2. updateRole — update role; return updated member with user
 */
import { AppError } from "@/shared/errors";
import type { UpdateMemberRoleInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { updateRole } from "./steps/update-role";

export const updateMemberRole = async (
  input: UpdateMemberRoleInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, role, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:member:role-update", scope);

  return updateRole(memberId, workspaceId, role, db);
};
