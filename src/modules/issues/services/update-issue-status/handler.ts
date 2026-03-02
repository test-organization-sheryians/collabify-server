/**
 * updateIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus          — load status lean
 *   2. verifyProjectMember  — auth gate
 *   3. patchStatus          — update name/color/icon
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueStatusInput } from "./schema";
import type { UpdateIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { verifyProjectMember } from "./steps/verify-project-member";
import { patchStatus } from "./steps/patch-status";

const logger = createLogger("issues:services:update-issue-status");

export const updateIssueStatusHandler = async (
  input: UpdateIssueStatusInput,
  ctx: ServiceContext
): Promise<UpdateIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("updateIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  const status = await patchStatus(input, ctx.db);

  logger.info("updateIssueStatus done", { statusId: status.id });
  return { status };
};
