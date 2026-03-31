/**
 * getProjectMembers — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectMember — cache-backed; FORBIDDEN if not a project member
 *   - permissions.assert("project:member:read") — RBAC check
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId
 *   2. [auth] assertProjectMember + assert("project:member:read") — parallel
 *   3. fetchProjectMembers — load all project members with user profiles
 */
import { AppError } from "@/shared/errors";
import type { GetProjectMembersInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectMembers } from "./steps/fetch-project-members";

export const getProjectMembers = async (
  input: GetProjectMembersInput,
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
    ctx.authGate.assertWorkspaceMember(project.workspaceId),
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("project:member:read", scope),
  ]);

  return fetchProjectMembers(projectId, db);
};
