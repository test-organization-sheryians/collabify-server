/**
 * moveIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean
 *   2. getProject           — cache-backed fetch for workspaceId
 *   3. assertProjectMember  — auth gate (cache-backed)
 *   4. assert issue:update  — RBAC permission check
 *   5. validateStatus       — target statusId belongs to project
 *   6. moveIssue            — update statusId + position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { MoveIssueStatusInput } from "./schema";
import type { MoveIssueStatusResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { validateStatus } from "./steps/validate-status";
import { moveIssue } from "./steps/move-issue";

const logger = createLogger("issues:services:move-issue-status");

export const moveIssueStatusHandler = async (
  input: MoveIssueStatusInput,
  ctx: ServiceContext
): Promise<MoveIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("moveIssueStatus started", { userId, issueId: input.issueId });

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

  await validateStatus(input.statusId, existing.projectId, ctx.db);
  const issue = await moveIssue(input, ctx.db);

  logger.info("moveIssueStatus done", { issueId: issue.id });
  return { issue };
};
