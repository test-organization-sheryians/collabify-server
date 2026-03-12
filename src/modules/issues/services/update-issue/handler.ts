/**
 * updateIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean (get projectId)
 *   2. getProject           — cache-backed fetch for workspaceId
 *   3. assertProjectMember  — auth gate (cache-backed)
 *   4. assert issue:update  — RBAC permission check (cache-backed)
 *   5. validateLabels       — all labelIds belong to project
 *   6. updateIssue          — patch fields + sync labels
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueInput } from "./schema";
import type { UpdateIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { validateLabels } from "./steps/validate-labels";
import { updateIssue } from "./steps/update-issue";

const logger = createLogger("issues:services:update-issue");

export const updateIssueHandler = async (
  input: UpdateIssueInput,
  ctx: ServiceContext
): Promise<UpdateIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("updateIssue started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue:update", scope),
  ]);

  await validateLabels(input.labelIds, existing.projectId, ctx.db);
  const issue = await updateIssue(input, ctx.db);

  logger.info("updateIssue done", { issueId: issue.id });
  return { issue };
};
