/**
 * reorderIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean
 *   2. verifyProjectMember  — auth gate
 *   3. updatePosition       — set new fractional position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ReorderIssueInput } from "./schema";
import type { ReorderIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { updatePosition } from "./steps/update-position";

const logger = createLogger("issues:services:reorder-issue");

export const reorderIssueHandler = async (
  input: ReorderIssueInput,
  ctx: ServiceContext
): Promise<ReorderIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("reorderIssue started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  const issue = await updatePosition(input, ctx.db);

  logger.info("reorderIssue done", { issueId: issue.id });
  return { issue };
};
