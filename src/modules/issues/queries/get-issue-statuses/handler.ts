/**
 * getIssueStatuses — Query Handler
 *
 * Steps:
 *   1. verifyProjectMember — auth gate
 *   2. fetchStatuses       — return columns ordered by position
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueStatusesInput } from "./schema";
import { verifyProjectMember } from "./steps/verify-project-member";
import { fetchStatuses } from "./steps/fetch-statuses";

const logger = createLogger("issues:queries:get-issue-statuses");

export const getIssueStatusesHandler = async (
  input: GetIssueStatusesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("getIssueStatuses started", {
    userId,
    projectId: input.projectId,
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  const statuses = await fetchStatuses(input.projectId, ctx.db);

  logger.debug("getIssueStatuses done", { count: statuses.length });
  return statuses;
};
