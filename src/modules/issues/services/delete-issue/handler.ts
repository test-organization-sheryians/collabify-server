/**
 * deleteIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean, throw NOT_FOUND if missing
 *   2. verifyProjectMember  — auth gate
 *   3. softDeleteIssue      — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueInput } from "./schema";
import type { DeleteIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { softDeleteIssue } from "./steps/soft-delete-issue";

const logger = createLogger("issues:services:delete-issue");

export const deleteIssueHandler = async (
  input: DeleteIssueInput,
  ctx: ServiceContext
): Promise<DeleteIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("deleteIssue started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  await softDeleteIssue(input.issueId, ctx.db);

  logger.info("deleteIssue done", { issueId: input.issueId });
  return { success: true, id: input.issueId };
};
