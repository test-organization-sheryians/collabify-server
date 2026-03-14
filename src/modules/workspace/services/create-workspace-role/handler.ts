/**
 * createWorkspaceRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — ADMIN+ can manage roles
 *   - permissions.assert("workspace.role:create")
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.role:create") — parallel
 *   2. guardRank — actor rank must be > target rank (privilege escalation guard)
 *   3. insertRole — duplicate-name check then create Role row
 */
import { AppError } from "@/shared/errors";
import type { CreateWorkspaceRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { guardRank } from "./steps/guard-rank";
import { insertRole } from "./steps/insert-role";

export const createWorkspaceRole = async (
  input: CreateWorkspaceRoleInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, name, rank, description } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.role:create", scope),
  ]);

  await guardRank(workspaceId, actorUserId, rank, ctx.db);
  const role = await insertRole(workspaceId, name, rank, description, ctx.db);
  return {
    ...role,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
};
