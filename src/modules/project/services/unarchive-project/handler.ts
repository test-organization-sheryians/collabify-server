/**
 * unarchiveProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:archive") — MANAGER+ only (RBAC)
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId (needed for scope)
 *   2. [auth] assert("project:archive")
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
  await ctx.permissions.assert("project:archive", scope);

  return setUnarchived(projectId, db);
};
