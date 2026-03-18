/**
 * deleteIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean
 *   2. getProject           — cache-backed fetch for workspaceId
 *   3. assertProjectMember  — auth gate (cache-backed)
 *   4. assert issue:delete  — RBAC permission check (cache-backed)
 *   5. softDeleteIssue      — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueInput } from "./schema";
import type { DeleteIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { softDeleteIssue } from "./steps/soft-delete-issue";

const logger = createLogger("issues:services:delete-issue");

export const deleteIssueHandler = async (
  input: DeleteIssueInput,
  ctx: ServiceContext
): Promise<DeleteIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("deleteIssue started", { userId, issueId: input.issueId });

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
    ctx.permissions.assert("issue:delete", scope),
  ]);

  await softDeleteIssue(input.issueId, ctx.db);

  logger.info("deleteIssue done", { issueId: input.issueId });
  return { success: true, id: input.issueId };
};
