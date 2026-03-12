/**
 * updateIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus               — load status lean
 *   2. getProject                — cache-backed fetch for workspaceId
 *   3. assertProjectMember       — auth gate (cache-backed)
 *   4. assert issue.status:update — RBAC permission check
 *   5. patchStatus               — update name/color/icon
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueStatusInput } from "./schema";
import type { UpdateIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { patchStatus } from "./steps/patch-status";

const logger = createLogger("issues:services:update-issue-status");

export const updateIssueStatusHandler = async (
  input: UpdateIssueStatusInput,
  ctx: ServiceContext
): Promise<UpdateIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("updateIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue.status:update", scope),
  ]);

  const status = await patchStatus(input, ctx.db);

  logger.info("updateIssueStatus done", { statusId: status.id });
  return { status };
};
