/**
 * getProjectIssues — Query Handler
 *
 * Steps:
 *   1. verifyProjectMember — auth gate
 *   2. buildWhereFilter    — construct Prisma where from optional filters
 *   3. fetchIssues         — return issues sorted by priority then position
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectIssuesInput } from "./schema";
import { verifyProjectMember } from "./steps/verify-project-member";
import { buildWhereFilter } from "./steps/build-where-filter";
import { fetchIssues } from "./steps/fetch-issues";

const logger = createLogger("issues:queries:get-project-issues");

export const getProjectIssuesHandler = async (
  input: GetProjectIssuesInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("getProjectIssues started", {
    userId,
    projectId: input.projectId,
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  const where = buildWhereFilter(input);
  const issues = await fetchIssues(where, ctx.db);

  logger.debug("getProjectIssues done", { count: issues.length });
  return issues;
};
