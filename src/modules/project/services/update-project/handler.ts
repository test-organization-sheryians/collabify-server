/**
 * updateProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:update") — MANAGER+ only (RBAC)
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId (needed for scope)
 *   2. [auth] assert("project:update")
 *   3. updateProjectFields — update name/description/isPrivate/logoS3Key/key; return project
 *
 * Key rename note:
 *   If `key` is present in the input, updateProjectFields performs a workspace-scoped
 *   uniqueness check and throws CONFLICT if taken. The client is responsible for
 *   navigating to the new project URL after a successful key change.
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateProjectFields } from "./steps/update-project-fields";

export const updateProject = async (
  input: UpdateProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId, name, description, isPrivate, logoS3Key, key } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };
  await ctx.permissions.assert("project:update", scope);

  return updateProjectFields(
    projectId,
    { name, description, isPrivate, logoS3Key, key },
    db
  );
};
