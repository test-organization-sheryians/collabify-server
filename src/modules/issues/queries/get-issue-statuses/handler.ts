/**
 * getIssueStatuses — Query Handler
 *
 * Steps:
 *   1. getProject                — cache-backed fetch for workspaceId
 *   2. assertProjectMember       — auth gate (cache-backed)
 *   3. assert issue.status:read  — RBAC permission check
 *   4. fetchStatuses             — return columns ordered by position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueStatusesInput } from "./schema";
import { fetchStatuses } from "./steps/fetch-statuses";

const logger = createLogger("issues:queries:get-issue-statuses");

export const getIssueStatusesHandler = async (
  input: GetIssueStatusesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("getIssueStatuses started", {
    userId,
    projectId: input.projectId,
  });

  const project = await ctx.authGate.getProject(input.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: input.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(input.projectId),
    ctx.permissions.assert("issue.status:read", scope),
  ]);

  const statuses = await fetchStatuses(input.projectId, ctx.db);

  logger.debug("getIssueStatuses done", { count: statuses.length });
  return statuses;
};
