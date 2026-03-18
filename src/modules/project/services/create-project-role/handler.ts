/**
 * createProjectRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — MANAGER+ can manage project roles
 *   - permissions.assert("project.role:create")
 * Steps:
 *   1. [auth] assertProjectManager + assert("project.role:create") — parallel
 *   2. guardProjectRank — actor rank must be > target rank
 *   3. insertProjectRole — duplicate-name check then create Role row
 */
import { AppError } from "@/shared/errors";
import type { CreateProjectRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { guardProjectRank } from "./steps/guard-project-rank";
import { insertProjectRole } from "./steps/insert-project-role";

export const createProjectRole = async (
  input: CreateProjectRoleInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, name, rank, description } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "project" as const, id: projectId, workspaceId };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, workspaceId),
    ctx.permissions.assert("project.role:create", scope),
  ]);

  await guardProjectRank(projectId, actorUserId, rank, ctx.db);
  const role = await insertProjectRole(projectId, workspaceId, name, rank, description, ctx.db);
  return {
    ...role,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
};
