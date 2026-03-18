/**
 * getIssue — Query Handler
 *
 * Steps:
 *   1. fetchIssue          — lean fetch (need projectId)
 *   2. getProject          — cache-backed fetch for workspaceId
 *   3. assertProjectMember — auth gate (cache-backed)
 *   4. assert issue:read   — RBAC permission check
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueInput } from "./schema";
import { fetchIssue } from "./steps/fetch-issue";

const logger = createLogger("issues:queries:get-issue");

export const getIssueHandler = async (
  input: GetIssueInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("getIssue started", { userId, issueId: input.issueId });

  const issue = await fetchIssue(input.issueId, ctx.db);
  const project = await ctx.authGate.getProject(issue.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: issue.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(issue.projectId),
    ctx.permissions.assert("issue:read", scope),
  ]);

  logger.debug("getIssue done", { issueId: issue.id });
  return issue;
};
