/**
 * createIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyProjectMember   — auth gate
 *   2. checkDuplicateName    — throw CONFLICT if name already exists
 *   3. insertLabel           — create IssueLabel row
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueLabelInput } from "./schema";
import type { CreateIssueLabelResult } from "./types";
import { verifyProjectMember } from "./steps/verify-project-member";
import { checkDuplicateName } from "./steps/check-duplicate-name";
import { insertLabel } from "./steps/insert-label";

const logger = createLogger("issues:services:create-issue-label");

export const createIssueLabelHandler = async (
  input: CreateIssueLabelInput,
  ctx: ServiceContext
): Promise<CreateIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("createIssueLabel started", {
    userId,
    projectId: input.projectId,
  });

  await verifyProjectMember(input.projectId, userId, ctx.db);
  await checkDuplicateName(input.name, input.projectId, ctx.db);
  const label = await insertLabel(input, ctx.db);

  logger.info("createIssueLabel done", { labelId: label.id });
  return { label };
};
