/**
 * deleteIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus               — load status (id, projectId, isSystem)
 *   2. guardSystemStatus         — throw FORBIDDEN if isSystem = true
 *   3. getProject                — cache-backed fetch for workspaceId
 *   4. assertProjectMember       — auth gate (cache-backed)
 *   5. assert issue.status:delete — RBAC permission check
 *   6. guardNonEmptyColumn       — throw CONFLICT if column has active issues
 *   7. softDeleteStatus          — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueStatusInput } from "./schema";
import type { DeleteIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { guardSystemStatus } from "./steps/guard-system-status";
import { guardNonEmptyColumn } from "./steps/guard-non-empty-column";
import { softDeleteStatus } from "./steps/soft-delete-status";

const logger = createLogger("issues:services:delete-issue-status");

export const deleteIssueStatusHandler = async (
  input: DeleteIssueStatusInput,
  ctx: ServiceContext
): Promise<DeleteIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("deleteIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  guardSystemStatus(existing.isSystem);

  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue.status:delete", scope),
  ]);

  await guardNonEmptyColumn(input.statusId, ctx.db);
  await softDeleteStatus(input.statusId, ctx.db);

  logger.info("deleteIssueStatus done", { statusId: input.statusId });
  return { success: true, id: input.statusId };
};
