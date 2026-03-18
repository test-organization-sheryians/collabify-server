/**
 * getProjectOverview — Query Handler (thin orchestrator)
 *
 * Returns a full project snapshot in one round-trip:
 *   - Issue counts (total / open / completed / overdue)
 *   - Issues grouped by status (with count)
 *   - Top 5 recently updated issues
 *   - All project members with role + user info
 *   - Page count
 *
 * Auth:
 *   - assertWorkspaceMember(workspaceId)
 *   - assertProjectMember(projectId)
 *   - permissions.assert("project:read", projectScope)
 */
import { AppError } from "@/shared/errors";
import type { GetProjectOverviewInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectOverview } from "./steps/fetch-project-overview";

export const getProjectOverview = async (
  input: GetProjectOverviewInput,
  ctx: ServiceContext
) => {
  const { projectId } = input;
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
    ctx.permissions.assert("project:read", scope),
  ]);

  return fetchProjectOverview(projectId, db);
};
