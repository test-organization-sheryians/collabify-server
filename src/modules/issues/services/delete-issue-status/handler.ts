/**
 * deleteIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus          — load status (id, projectId, isSystem)
 *   2. guardSystemStatus    — throw FORBIDDEN if isSystem = true
 *   3. verifyProjectMember  — auth gate
 *   4. guardNonEmptyColumn  — throw CONFLICT if column has active issues
 *   5. softDeleteStatus     — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueStatusInput } from "./schema";
import type { DeleteIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { guardSystemStatus } from "./steps/guard-system-status";
import { verifyProjectMember } from "./steps/verify-project-member";
import { guardNonEmptyColumn } from "./steps/guard-non-empty-column";
import { softDeleteStatus } from "./steps/soft-delete-status";

const logger = createLogger("issues:services:delete-issue-status");

export const deleteIssueStatusHandler = async (
  input: DeleteIssueStatusInput,
  ctx: ServiceContext
): Promise<DeleteIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("deleteIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  guardSystemStatus(existing.isSystem);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  await guardNonEmptyColumn(input.statusId, ctx.db);
  await softDeleteStatus(input.statusId, ctx.db);

  logger.info("deleteIssueStatus done", { statusId: input.statusId });
  return { success: true, id: input.statusId };
};
