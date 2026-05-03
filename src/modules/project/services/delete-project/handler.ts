/**
 * deleteProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:delete") — MANAGER+ only (RBAC)
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId (needed for scope)
 *   2. [auth] assert("project:delete")
 *   3. softDeleteProject — set deletedAt = now
 */
import { AppError } from "@/shared/errors";
import type { DeleteProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { softDeleteProject } from "./steps/soft-delete-project";

export const deleteProject = async (
  input: DeleteProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };
  await ctx.permissions.assert("project:delete", scope);

  await softDeleteProject(projectId, db);
  return true;
};
