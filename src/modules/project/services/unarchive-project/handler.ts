/**
 * unarchiveProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectManager — FORBIDDEN if actor cannot manage project
 *   - permissions.assert("project:archive") — RBAC check
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId
 *   2. [auth] assertProjectManager + assert("project:archive") — parallel
 *   3. setUnarchived — set isArchived=false; return project
 */
import { AppError } from "@/shared/errors";
import type { UnarchiveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { setUnarchived } from "./steps/set-unarchived";

export const unarchiveProject = async (
  input: UnarchiveProjectInput,
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
  await Promise.all([
    ctx.authGate.assertProjectManager(projectId, project.workspaceId),
    ctx.permissions.assert("project:archive", scope),
  ]);

  return setUnarchived(projectId, db);
};
