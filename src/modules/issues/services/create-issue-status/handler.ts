/**
 * createIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyProjectMember  — auth gate
 *   2. insertStatus         — append column after last position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueStatusInput } from "./schema";
import type { CreateIssueStatusResult } from "./types";
import { verifyProjectMember } from "./steps/verify-project-member";
import { insertStatus } from "./steps/insert-status";

const logger = createLogger("issues:services:create-issue-status");

export const createIssueStatusHandler = async (
  input: CreateIssueStatusInput,
  ctx: ServiceContext
): Promise<CreateIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("createIssueStatus started", {
    userId,
    projectId: input.projectId,
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  const status = await insertStatus(input, ctx.db);

  logger.info("createIssueStatus done", { statusId: status.id });
  return { status };
};
