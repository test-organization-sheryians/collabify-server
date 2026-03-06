/**
 * getIssue — Query Handler
 *
 * Steps:
 *   1. verifyProjectMember — auth gate (derived from issue.projectId)
 *   2. fetchIssue          — single issue with all relations
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueInput } from "./schema";
import { verifyProjectMember } from "./steps/verify-project-member";
import { fetchIssue } from "./steps/fetch-issue";

const logger = createLogger("issues:queries:get-issue");

export const getIssueHandler = async (
  input: GetIssueInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("getIssue started", { userId, issueId: input.issueId });

  // Fetch first, then guard — we need projectId from the issue row
  const issue = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(issue.projectId, userId, ctx.db);

  logger.debug("getIssue done", { issueId: issue.id });
  return issue;
};
