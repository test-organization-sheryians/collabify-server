/**
 * getIssueLabels — Query Handler
 *
 * Steps:
 *   1. verifyProjectMember — auth gate
 *   2. fetchLabels         — return project labels ordered by createdAt
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueLabelsInput } from "./schema";
import { verifyProjectMember } from "./steps/verify-project-member";
import { fetchLabels } from "./steps/fetch-labels";

const logger = createLogger("issues:queries:get-issue-labels");

export const getIssueLabelsHandler = async (
  input: GetIssueLabelsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("getIssueLabels started", {
    userId,
    projectId: input.projectId,
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  const labels = await fetchLabels(input.projectId, ctx.db);

  logger.debug("getIssueLabels done", { count: labels.length });
  return labels;
};
