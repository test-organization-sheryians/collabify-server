/**
 * updateIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean, throw NOT_FOUND if missing
 *   2. verifyProjectMember  — auth gate
 *   3. validateLabels       — validate provided labelIds
 *   4. updateIssue          — tx: replace labels + patch fields
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueInput } from "./schema";
import type { UpdateIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { validateLabels } from "./steps/validate-labels";
import { updateIssue } from "./steps/update-issue";

const logger = createLogger("issues:services:update-issue");

export const updateIssueHandler = async (
  input: UpdateIssueInput,
  ctx: ServiceContext
): Promise<UpdateIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("updateIssue started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  await validateLabels(input.labelIds, existing.projectId, ctx.db);
  const issue = await updateIssue(input, ctx.db);

  logger.info("updateIssue done", { issueId: issue.id });
  return { issue };
};
