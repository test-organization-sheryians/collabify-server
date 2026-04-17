/**
 * getProjectEntities — Query Handler (thin orchestrator)
 *
 * Returns all taggable entities within a project for search/picker UI.
 * Auth:
 *   - assertProjectMember — cache-backed; FORBIDDEN if not a project member
 *   - permissions.assert("project:member:read") — RBAC check
 *
 * Steps:
 *   1. validateAccess — RBAC + membership checks
 *   2. fetchEntities — Parallel fetch of all entity types
 *   3. mergeEntities — Combine results into SearchEntity[]
 */
import { AppError } from "@/shared/errors";
import type { GetProjectEntitiesInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { validateAccess } from "./steps/validate-access";
import { fetchEntities } from "./steps/fetch-entities";
import { mergeEntities } from "./steps/merge-entities";

export const getProjectEntities = async (
  input: GetProjectEntitiesInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertWorkspaceMember(project.workspaceId),
    ctx.authGate.assertProjectMember(projectId),
    // ctx.permissions.assert("project:member:read", scope),
  ]);

  await validateAccess(projectId, actorUserId, ctx);

  const rawEntities = await fetchEntities(projectId, ctx);
  return mergeEntities(rawEntities);
};
