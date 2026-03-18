/**
 * updateProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project:update") — RBAC check
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId
 *   2. [auth] assertProjectManager + assert("project:update") — parallel
 *   3. updateProjectFields — update name/description/isPrivate; return project
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateProjectFields } from "./steps/update-project-fields";

export const updateProject = async (
  input: UpdateProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId, name, description, isPrivate } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, project.workspaceId),
    ctx.permissions.assert("project:update", scope),
  ]);

  return updateProjectFields(projectId, { name, description, isPrivate }, db);
};
