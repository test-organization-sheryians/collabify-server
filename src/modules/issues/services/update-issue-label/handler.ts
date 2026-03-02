/**
 * updateIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchLabel           — load label lean
 *   2. verifyProjectMember  — auth gate
 *   3. patchLabel           — update name/color
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueLabelInput } from "./schema";
import type { UpdateIssueLabelResult } from "./types";
import { fetchLabel } from "./steps/fetch-label";
import { verifyProjectMember } from "./steps/verify-project-member";
import { patchLabel } from "./steps/patch-label";

const logger = createLogger("issues:services:update-issue-label");

export const updateIssueLabelHandler = async (
  input: UpdateIssueLabelInput,
  ctx: ServiceContext
): Promise<UpdateIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("updateIssueLabel started", { userId, labelId: input.labelId });

  const existing = await fetchLabel(input.labelId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  const label = await patchLabel(input, ctx.db);

  logger.info("updateIssueLabel done", { labelId: label.id });
  return { label };
};
