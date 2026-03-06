/**
 * createIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyProjectMember  — auth gate
 *   2. validateStatus       — statusId belongs to project
 *   3. validateLabels       — all labelIds belong to project
 *   4. insertIssue          — atomic: seq number + position + create + labels
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueInput } from "./schema";
import type { CreateIssueResult } from "./types";
import { verifyProjectMember } from "./steps/verify-project-member";
import { validateStatus } from "./steps/validate-status";
import { validateLabels } from "./steps/validate-labels";
import { insertIssue } from "./steps/insert-issue";

const logger = createLogger("issues:services:create-issue");

export const createIssueHandler = async (
  input: CreateIssueInput,
  ctx: ServiceContext
): Promise<CreateIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("createIssue started", { userId, projectId: input.projectId });

  const project = await ctx.db.project.findUniqueOrThrow({
    where: { id: input.projectId },
    select: { workspaceId: true },
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  await validateStatus(input.statusId, input.projectId, ctx.db);
  await validateLabels(input.labelIds, input.projectId, ctx.db);
  const issue = await insertIssue(input, project.workspaceId, userId, ctx.db);

  logger.info("createIssue done", { issueId: issue.id, number: issue.number });
  return { issue };
};
