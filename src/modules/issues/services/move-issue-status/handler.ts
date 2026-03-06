/**
 * moveIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean
 *   2. verifyProjectMember  — auth gate
 *   3. validateStatus       — target statusId belongs to project
 *   4. moveIssue            — update statusId + position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { MoveIssueStatusInput } from "./schema";
import type { MoveIssueStatusResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { validateStatus } from "./steps/validate-status";
import { moveIssue } from "./steps/move-issue";

const logger = createLogger("issues:services:move-issue-status");

export const moveIssueStatusHandler = async (
  input: MoveIssueStatusInput,
  ctx: ServiceContext
): Promise<MoveIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("moveIssueStatus started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  await validateStatus(input.statusId, existing.projectId, ctx.db);
  const issue = await moveIssue(input, ctx.db);

  logger.info("moveIssueStatus done", { issueId: issue.id });
  return { issue };
};
