/**
 * reorderIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean
 *   2. getProject           — cache-backed fetch for workspaceId
 *   3. assertProjectMember  — auth gate (cache-backed)
 *   4. assert issue:update  — RBAC permission check (position update = issue update)
 *   5. updatePosition       — set fractional position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ReorderIssueInput } from "./schema";
import type { ReorderIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { updatePosition } from "./steps/update-position";

const logger = createLogger("issues:services:reorder-issue");

export const reorderIssueHandler = async (
  input: ReorderIssueInput,
  ctx: ServiceContext
): Promise<ReorderIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("reorderIssue started", { userId, issueId: input.issueId });

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

  const issue = await updatePosition(input, ctx.db);

  logger.info("reorderIssue done", { issueId: issue.id });
  return { issue };
};
