/**
 * getProjectIssues — Query Handler
 *
 * Steps:
 *   1. getProject           — cache-backed fetch for workspaceId
 *   2. assertProjectMember  — auth gate (cache-backed)
 *   3. assert issue:read    — RBAC permission check
 *   4. buildWhereFilter     — construct Prisma where from optional filters
 *   5. fetchIssues          — return issues sorted by priority then position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectIssuesInput } from "./schema";
import { buildWhereFilter } from "./steps/build-where-filter";
import { fetchIssues } from "./steps/fetch-issues";

const logger = createLogger("issues:queries:get-project-issues");

export const getProjectIssuesHandler = async (
  input: GetProjectIssuesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("getProjectIssues started", {
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
    ctx.permissions.assert("issue:read", scope),
  ]);

  const where = buildWhereFilter(input);
  const issues = await fetchIssues(where, ctx.db);

  logger.debug("getProjectIssues done", { count: issues.length });
  return issues;
};
